"""
Ouro Finance - Algorand Perpetual DEX Smart Contract

Based on the Sway SimpleFutures reference implementation, this contract provides:
- Long and short position management
- Leveraged trading with margin requirements
- Price oracle integration
- Liquidation mechanisms
- Multi-asset perpetual futures
"""

from algopy import *


@struct
class Position:
    """Position data structure matching Sway reference"""
    margin: UInt64              # Collateral deposited
    entry_price: UInt64         # Entry price (8 decimals)
    is_open: bool              # Position status
    holder: Account            # Position owner
    leverage: UInt64           # Leverage multiplier
    size: UInt64               # Position size
    symbol: String             # Trading pair symbol
    timestamp: UInt64          # Entry timestamp
    liquidation_price: UInt64  # Liquidation threshold


@struct
class GlobalConfig:
    """Global configuration parameters"""
    leverage_limit: UInt64          # Max leverage (default: 10)
    liquidation_threshold: UInt64   # Liquidation threshold (default: 80%)
    leverage_dividend: UInt64       # Precision divisor (default: 1000)
    maintenance_margin: UInt64      # Maintenance margin requirement
    asset_price: UInt64            # Current asset price cache
    futures_expiration: UInt64     # Contract expiration timestamp


class OuroDEX(ARC4Contract):
    """
    Main Ouro Finance DEX contract for perpetual futures trading
    """

    def __init__(self) -> None:
        """Initialize contract with default parameters"""
        self.admin = Txn.sender
        self.oracle_contract = UInt64(0)
        self.usdc_asset_id = UInt64(0)

        # Initialize global config
        self.config = GlobalConfig(
            leverage_limit=UInt64(10),
            liquidation_threshold=UInt64(80),
            leverage_dividend=UInt64(1000),
            maintenance_margin=UInt64(100_000_000),  # 100 USDC
            asset_price=UInt64(4000_00000000),  # $4000 default
            futures_expiration=UInt64(0)
        )

    @abimethod
    def setup_contract(
        self,
        oracle_app_id: UInt64,
        usdc_asset_id: UInt64,
        futures_expiration: UInt64,
        maintenance_margin: UInt64,
        leverage_dividend: UInt64,
        initial_asset_price: UInt64
    ) -> None:
        """
        Initialize contract parameters (admin only)
        Equivalent to Sway constructor
        """
        assert Txn.sender == self.admin, "Only admin can setup"

        self.oracle_contract = oracle_app_id
        self.usdc_asset_id = usdc_asset_id

        # Update configuration
        self.config = GlobalConfig(
            leverage_limit=self.config.leverage_limit,
            liquidation_threshold=self.config.liquidation_threshold,
            leverage_dividend=leverage_dividend,
            maintenance_margin=maintenance_margin,
            asset_price=initial_asset_price,
            futures_expiration=futures_expiration
        )

    @abimethod
    def open_position(
        self,
        symbol: String,
        leverage: UInt64,
        is_long: bool,
        margin_payment: gtxn.PaymentTransaction,
        oracle_call: gtxn.ApplicationCallTransaction
    ) -> UInt64:
        """
        Open a new perpetual position
        Based on Sway open_position function
        """
        trader = Txn.sender

        # Validate margin payment
        assert margin_payment.receiver == Global.current_application_address
        assert margin_payment.asset_id == self.usdc_asset_id
        margin_amount = margin_payment.amount

        # Validate inputs (matching Sway logic)
        assert margin_amount > 0, "Amount cannot be zero"
        assert leverage <= self.config.leverage_limit, "Leverage too high"
        assert leverage > 0, "Leverage must be positive"

        # Get current price from oracle
        current_price = self._get_oracle_price(symbol, oracle_call)

        # Calculate position parameters
        leverage_div = self.config.leverage_dividend
        calculated_margin = current_price / leverage_div
        position_size = margin_amount * leverage

        # Calculate liquidation price
        liquidation_price = self._calculate_liquidation_price(
            current_price, leverage, is_long
        )

        # Generate unique position ID
        position_id = self._generate_position_id(trader, symbol)

        # Create position struct
        new_position = Position(
            margin=calculated_margin,
            entry_price=current_price,
            is_open=False,  # Sway sets to false initially
            holder=trader,
            leverage=leverage,
            size=position_size,
            symbol=symbol,
            timestamp=Global.latest_timestamp,
            liquidation_price=liquidation_price
        )

        # Store position in box storage
        position_key = self._get_position_key(position_id)
        app.box_put(position_key, new_position)

        # Emit position opened event
        log(Bytes(b"position_opened:") + op.itob(position_id))

        return position_id

    @abimethod
    def close_position(
        self,
        position_id: UInt64,
        oracle_call: gtxn.ApplicationCallTransaction
    ) -> UInt64:
        """
        Close an existing position
        Returns final payout amount
        """
        trader = Txn.sender
        position_key = self._get_position_key(position_id)

        # Get position from storage
        position_data, exists = app.box_get(position_key)
        assert exists, "Position not found"
        position = Position.from_bytes(position_data)

        # Verify ownership
        assert position.holder == trader, "Not position owner"
        assert not position.is_open, "Position is closed"

        # Get current market price
        current_price = self._get_oracle_price(position.symbol, oracle_call)

        # Calculate PnL
        pnl = self._calculate_pnl(position, current_price)

        # Calculate final payout (margin + PnL)
        final_payout = position.margin
        if pnl > 0:
            final_payout += pnl
        elif abs(pnl) < position.margin:
            final_payout -= abs(pnl)
        else:
            final_payout = UInt64(0)  # Total loss

        # Transfer payout if positive
        if final_payout > 0:
            itxn.AssetTransfer(
                xfer_asset=self.usdc_asset_id,
                asset_receiver=trader,
                asset_amount=final_payout
            ).submit()

        # Mark position as closed (Sway sets isOpen = true when closing)
        updated_position = Position(
            margin=position.margin,
            entry_price=position.entry_price,
            is_open=True,  # Matching Sway behavior
            holder=position.holder,
            leverage=position.leverage,
            size=position.size,
            symbol=position.symbol,
            timestamp=position.timestamp,
            liquidation_price=position.liquidation_price
        )

        app.box_put(position_key, updated_position)

        # Emit position closed event
        log(Bytes(b"position_closed:") + op.itob(position_id) + Bytes(b":pnl:") + op.itob(pnl))

        return final_payout

    @abimethod(readonly=True)
    def get_position(self, position_id: UInt64) -> Position:
        """
        Get position by ID
        Matches Sway get_position function
        """
        position_key = self._get_position_key(position_id)
        position_data, exists = app.box_get(position_key)
        assert exists, "Position not found"
        return Position.from_bytes(position_data)

    @abimethod
    def liquidate_position(
        self,
        position_id: UInt64,
        oracle_call: gtxn.ApplicationCallTransaction
    ) -> bool:
        """
        Liquidate an undercollateralized position
        """
        liquidator = Txn.sender
        position_key = self._get_position_key(position_id)

        # Get position
        position_data, exists = app.box_get(position_key)
        assert exists, "Position not found"
        position = Position.from_bytes(position_data)

        # Get current price
        current_price = self._get_oracle_price(position.symbol, oracle_call)

        # Check liquidation condition
        should_liquidate = self._check_liquidation(position, current_price)
        assert should_liquidate, "Position is healthy"

        # Calculate liquidation reward (5% of margin)
        liquidation_reward = position.margin * 5 / 100

        # Transfer reward to liquidator
        itxn.AssetTransfer(
            xfer_asset=self.usdc_asset_id,
            asset_receiver=liquidator,
            asset_amount=liquidation_reward
        ).submit()

        # Remove position
        app.box_delete(position_key)

        # Emit liquidation event
        log(Bytes(b"position_liquidated:") + op.itob(position_id))

        return True

    @abimethod
    def set_asset_price(self, new_price: UInt64) -> None:
        """
        Set asset price (admin only)
        Matches Sway set_asset_price
        """
        assert Txn.sender == self.admin, "Only admin can set price"

        self.config = GlobalConfig(
            leverage_limit=self.config.leverage_limit,
            liquidation_threshold=self.config.liquidation_threshold,
            leverage_dividend=self.config.leverage_dividend,
            maintenance_margin=self.config.maintenance_margin,
            asset_price=new_price,
            futures_expiration=self.config.futures_expiration
        )

    @abimethod(readonly=True)
    def get_contract_margin(self) -> UInt64:
        """
        Get required margin amount
        Matches Sway get_contract_margin
        """
        latest_asset_price = self.config.asset_price
        leverage_div = self.config.leverage_dividend
        contract_margin = latest_asset_price / leverage_div

        return contract_margin

    @abimethod(readonly=True)
    def get_config(self) -> GlobalConfig:
        """Get current contract configuration"""
        return self.config

    # Internal helper functions

    def _get_oracle_price(self, symbol: String, oracle_call: gtxn.ApplicationCallTransaction) -> UInt64:
        """Get price from oracle contract"""
        # Verify oracle call
        assert oracle_call.application_id == self.oracle_contract

        # For now, return cached price (would integrate with actual oracle)
        return self.config.asset_price

    def _calculate_liquidation_price(self, entry_price: UInt64, leverage: UInt64, is_long: bool) -> UInt64:
        """Calculate liquidation price based on leverage and direction"""
        threshold = self.config.liquidation_threshold  # 80%

        if is_long:
            # Long liquidation: entry_price * (1 - 1/leverage * threshold/100)
            liquidation_price = entry_price * (100 - threshold / leverage) / 100
        else:
            # Short liquidation: entry_price * (1 + 1/leverage * threshold/100)
            liquidation_price = entry_price * (100 + threshold / leverage) / 100

        return liquidation_price

    def _calculate_pnl(self, position: Position, current_price: UInt64) -> Int64:
        """Calculate position PnL"""
        price_diff = Int64(current_price) - Int64(position.entry_price)

        if position.is_long:
            # Long PnL = (current_price - entry_price) * size / entry_price
            pnl = (price_diff * Int64(position.size)) / Int64(position.entry_price)
        else:
            # Short PnL = (entry_price - current_price) * size / entry_price
            pnl = (-price_diff * Int64(position.size)) / Int64(position.entry_price)

        return pnl

    def _check_liquidation(self, position: Position, current_price: UInt64) -> bool:
        """Check if position should be liquidated"""
        if position.is_long:
            return current_price <= position.liquidation_price
        else:
            return current_price >= position.liquidation_price

    def _generate_position_id(self, trader: Account, symbol: String) -> UInt64:
        """Generate unique position ID"""
        # Combine trader address, symbol, and timestamp for uniqueness
        id_bytes = trader.bytes + symbol.bytes + op.itob(Global.latest_timestamp)
        return op.btoi(op.sha256(id_bytes)[:8])  # Use first 8 bytes as ID

    def _get_position_key(self, position_id: UInt64) -> Bytes:
        """Generate box key for position storage"""
        return Bytes(b"pos_") + op.itob(position_id)