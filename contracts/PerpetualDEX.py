"""
Perpetual DEX Smart Contract for Algorand
Handles perpetual futures trading with leverage, liquidations, and funding rates
"""

from algopy import *

class PerpPosition(Struct):
    """Structure representing a perpetual position"""
    trader: Account
    symbol: String
    size: UInt64  # Position size in base units
    entry_price: UInt64  # Entry price with 8 decimal places
    margin: UInt64  # Initial margin deposited
    leverage: UInt64  # Leverage used (1-100x)
    is_long: Bool  # True for long, False for short
    timestamp: UInt64  # Position open timestamp
    funding_index: UInt64  # Funding rate index at entry
    liquidation_price: UInt64  # Liquidation price

class FundingRate(Struct):
    """Structure for funding rate data"""
    symbol: String
    rate: Int64  # Funding rate (can be negative)
    timestamp: UInt64
    cumulative_funding: Int64

class PerpetualDEX(ARC4Contract):
    """
    Main Perpetual DEX Contract
    """

    # Global state variables
    admin: Account
    fee_collector: Account
    trading_fee: UInt64  # Trading fee in basis points (e.g., 50 = 0.5%)
    funding_fee: UInt64  # Funding fee in basis points
    max_leverage: UInt64  # Maximum allowed leverage
    maintenance_margin_ratio: UInt64  # Maintenance margin ratio (basis points)
    liquidation_fee_ratio: UInt64  # Liquidation fee ratio (basis points)

    # Box storage for positions and funding rates
    positions_box: BoxKey[Bytes]
    funding_rates_box: BoxKey[Bytes]

    # Asset information
    usdc_asset_id: UInt64  # USDC asset ID for collateral

    # Protocol state
    total_long_positions: Mapping[String, UInt64]
    total_short_positions: Mapping[String, UInt64]
    total_volume: Mapping[String, UInt64]

    def __init__(self) -> None:
        # Initialize default values
        self.admin = Global.creator_address
        self.fee_collector = Global.creator_address
        self.trading_fee = UInt64(50)  # 0.5%
        self.funding_fee = UInt64(10)  # 0.1%
        self.max_leverage = UInt64(100)  # 100x max leverage
        self.maintenance_margin_ratio = UInt64(500)  # 5%
        self.liquidation_fee_ratio = UInt64(500)  # 5%
        self.usdc_asset_id = UInt64(0)  # To be set by admin

    @arc4.abimethod
    def setup_protocol(
        self,
        fee_collector: Account,
        usdc_asset_id: UInt64,
        trading_fee: UInt64,
        max_leverage: UInt64
    ) -> None:
        """Setup protocol parameters (admin only)"""
        assert Txn.sender == self.admin, "Only admin can setup protocol"

        self.fee_collector = fee_collector
        self.usdc_asset_id = usdc_asset_id
        self.trading_fee = trading_fee
        self.max_leverage = max_leverage

    @arc4.abimethod
    def open_position(
        self,
        symbol: String,
        size: UInt64,
        leverage: UInt64,
        is_long: Bool,
        margin_payment: PaymentTxn,
        price_oracle_txn: ApplicationCallTxn
    ) -> UInt64:
        """
        Open a new perpetual position
        Returns position ID
        """
        trader = Txn.sender

        # Verify leverage is within limits
        assert leverage > UInt64(0) and leverage <= self.max_leverage, "Invalid leverage"

        # Verify margin payment
        assert margin_payment.receiver == Global.current_application_address, "Invalid payment receiver"
        assert margin_payment.asset_id == self.usdc_asset_id, "Must pay with USDC"

        margin_amount = margin_payment.amount
        position_size = margin_amount * leverage

        # Get current price from oracle
        current_price = self._get_oracle_price(symbol, price_oracle_txn)

        # Calculate liquidation price
        liquidation_price = self._calculate_liquidation_price(
            current_price, leverage, is_long
        )

        # Create position
        position = PerpPosition(
            trader=trader,
            symbol=symbol,
            size=position_size,
            entry_price=current_price,
            margin=margin_amount,
            leverage=leverage,
            is_long=is_long,
            timestamp=Global.latest_timestamp,
            funding_index=self._get_current_funding_index(symbol),
            liquidation_price=liquidation_price
        )

        # Store position in box storage
        position_id = self._generate_position_id(trader, symbol)
        position_key = Bytes(b"pos_") + itob(position_id)

        self.positions_box[position_key] = position.bytes

        # Update protocol metrics
        if is_long:
            self.total_long_positions[symbol] = (
                self.total_long_positions.get(symbol, UInt64(0)) + position_size
            )
        else:
            self.total_short_positions[symbol] = (
                self.total_short_positions.get(symbol, UInt64(0)) + position_size
            )

        # Collect trading fee
        trading_fee_amount = (margin_amount * self.trading_fee) / UInt64(10000)
        self._transfer_fee(trading_fee_amount)

        return position_id

    @arc4.abimethod
    def close_position(
        self,
        position_id: UInt64,
        price_oracle_txn: ApplicationCallTxn
    ) -> UInt64:
        """
        Close an existing position
        Returns PnL amount
        """
        trader = Txn.sender
        position_key = Bytes(b"pos_") + itob(position_id)

        # Get position from storage
        position_data, exists = self.positions_box.maybe(position_key)
        assert exists, "Position not found"

        position = PerpPosition.from_bytes(position_data)
        assert position.trader == trader, "Not position owner"

        # Get current price
        current_price = self._get_oracle_price(position.symbol, price_oracle_txn)

        # Calculate PnL
        pnl = self._calculate_pnl(position, current_price)

        # Calculate funding fees
        funding_fee = self._calculate_funding_fee(position)

        # Calculate final payout
        final_amount = position.margin + pnl - funding_fee

        # Collect trading fee
        trading_fee_amount = (abs(pnl) * self.trading_fee) / UInt64(10000)
        final_amount -= trading_fee_amount

        # Ensure non-negative payout
        if final_amount < UInt64(0):
            final_amount = UInt64(0)

        # Transfer payout to trader
        if final_amount > UInt64(0):
            self._transfer_usdc(trader, final_amount)

        # Update protocol metrics
        if position.is_long:
            self.total_long_positions[position.symbol] = (
                self.total_long_positions[position.symbol] - position.size
            )
        else:
            self.total_short_positions[position.symbol] = (
                self.total_short_positions[position.symbol] - position.size
            )

        # Remove position from storage
        del self.positions_box[position_key]

        return final_amount

    @arc4.abimethod
    def liquidate_position(
        self,
        position_id: UInt64,
        price_oracle_txn: ApplicationCallTxn
    ) -> Bool:
        """
        Liquidate an undercollateralized position
        """
        liquidator = Txn.sender
        position_key = Bytes(b"pos_") + itob(position_id)

        # Get position from storage
        position_data, exists = self.positions_box.maybe(position_key)
        assert exists, "Position not found"

        position = PerpPosition.from_bytes(position_data)

        # Get current price
        current_price = self._get_oracle_price(position.symbol, price_oracle_txn)

        # Check if position should be liquidated
        assert self._should_liquidate(position, current_price), "Position is healthy"

        # Calculate liquidation reward
        liquidation_reward = (position.margin * self.liquidation_fee_ratio) / UInt64(10000)

        # Transfer reward to liquidator
        self._transfer_usdc(liquidator, liquidation_reward)

        # Update protocol metrics
        if position.is_long:
            self.total_long_positions[position.symbol] = (
                self.total_long_positions[position.symbol] - position.size
            )
        else:
            self.total_short_positions[position.symbol] = (
                self.total_short_positions[position.symbol] - position.size
            )

        # Remove position from storage
        del self.positions_box[position_key]

        return True

    @arc4.abimethod
    def update_funding_rate(
        self,
        symbol: String,
        new_rate: Int64
    ) -> None:
        """
        Update funding rate for a symbol (admin only)
        """
        assert Txn.sender == self.admin, "Only admin can update funding rate"

        # Get current funding data
        funding_key = Bytes(b"funding_") + symbol.bytes
        current_funding_data, exists = self.funding_rates_box.maybe(funding_key)

        cumulative_funding = Int64(0)
        if exists:
            current_funding = FundingRate.from_bytes(current_funding_data)
            cumulative_funding = current_funding.cumulative_funding + new_rate

        # Create new funding rate entry
        funding_rate = FundingRate(
            symbol=symbol,
            rate=new_rate,
            timestamp=Global.latest_timestamp,
            cumulative_funding=cumulative_funding
        )

        # Store updated funding rate
        self.funding_rates_box[funding_key] = funding_rate.bytes

    @arc4.abimethod(readonly=True)
    def get_position(self, position_id: UInt64) -> PerpPosition:
        """Get position data by ID"""
        position_key = Bytes(b"pos_") + itob(position_id)
        position_data, exists = self.positions_box.maybe(position_key)
        assert exists, "Position not found"
        return PerpPosition.from_bytes(position_data)

    @arc4.abimethod(readonly=True)
    def get_funding_rate(self, symbol: String) -> FundingRate:
        """Get current funding rate for symbol"""
        funding_key = Bytes(b"funding_") + symbol.bytes
        funding_data, exists = self.funding_rates_box.maybe(funding_key)
        assert exists, "Funding rate not found"
        return FundingRate.from_bytes(funding_data)

    # Internal helper methods

    def _get_oracle_price(self, symbol: String, oracle_txn: ApplicationCallTxn) -> UInt64:
        """Get price from oracle contract"""
        # This would integrate with a price oracle
        # For now, return a mock price
        return UInt64(4000_00000000)  # $4000 with 8 decimals

    def _calculate_liquidation_price(
        self, entry_price: UInt64, leverage: UInt64, is_long: Bool
    ) -> UInt64:
        """Calculate liquidation price based on entry price and leverage"""
        maintenance_ratio = self.maintenance_margin_ratio

        if is_long:
            # For long: liquidation_price = entry_price * (1 - 1/leverage + maintenance_ratio)
            liquidation_price = entry_price * (
                UInt64(10000) - UInt64(10000) // leverage + maintenance_ratio
            ) // UInt64(10000)
        else:
            # For short: liquidation_price = entry_price * (1 + 1/leverage - maintenance_ratio)
            liquidation_price = entry_price * (
                UInt64(10000) + UInt64(10000) // leverage - maintenance_ratio
            ) // UInt64(10000)

        return liquidation_price

    def _calculate_pnl(self, position: PerpPosition, current_price: UInt64) -> Int64:
        """Calculate unrealized PnL for a position"""
        price_diff = Int64(current_price) - Int64(position.entry_price)

        if position.is_long:
            pnl = (price_diff * Int64(position.size)) // Int64(position.entry_price)
        else:
            pnl = (-price_diff * Int64(position.size)) // Int64(position.entry_price)

        return pnl

    def _calculate_funding_fee(self, position: PerpPosition) -> UInt64:
        """Calculate funding fee for a position"""
        # Get current funding index
        current_index = self._get_current_funding_index(position.symbol)
        funding_diff = current_index - position.funding_index

        # Calculate funding fee
        funding_fee = (position.size * funding_diff) // UInt64(10000)

        return funding_fee

    def _get_current_funding_index(self, symbol: String) -> UInt64:
        """Get current cumulative funding index"""
        funding_key = Bytes(b"funding_") + symbol.bytes
        funding_data, exists = self.funding_rates_box.maybe(funding_key)

        if exists:
            funding_rate = FundingRate.from_bytes(funding_data)
            return UInt64(max(0, funding_rate.cumulative_funding))

        return UInt64(0)

    def _should_liquidate(self, position: PerpPosition, current_price: UInt64) -> Bool:
        """Check if position should be liquidated"""
        if position.is_long:
            return current_price <= position.liquidation_price
        else:
            return current_price >= position.liquidation_price

    def _generate_position_id(self, trader: Account, symbol: String) -> UInt64:
        """Generate unique position ID"""
        # Simple ID generation based on trader address and timestamp
        return UInt64(hash(trader.bytes + symbol.bytes + itob(Global.latest_timestamp)))

    def _transfer_usdc(self, recipient: Account, amount: UInt64) -> None:
        """Transfer USDC to recipient"""
        itxn.AssetTransfer(
            xfer_asset=self.usdc_asset_id,
            asset_receiver=recipient,
            asset_amount=amount,
        ).submit()

    def _transfer_fee(self, amount: UInt64) -> None:
        """Transfer fee to fee collector"""
        itxn.AssetTransfer(
            xfer_asset=self.usdc_asset_id,
            asset_receiver=self.fee_collector,
            asset_amount=amount,
        ).submit()