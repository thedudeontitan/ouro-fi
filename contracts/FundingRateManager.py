"""
Funding Rate Manager for Perpetual DEX
Calculates and manages funding rates based on market imbalance
"""

from algopy import *

class MarketData(Struct):
    """Market data structure"""
    symbol: String
    total_long_oi: UInt64  # Total long open interest
    total_short_oi: UInt64  # Total short open interest
    base_funding_rate: Int64  # Base funding rate
    max_funding_rate: Int64  # Maximum funding rate
    funding_interval: UInt64  # Funding interval in seconds

class FundingRateManager(ARC4Contract):
    """
    Funding Rate Manager Contract
    """

    # Global state
    admin: Account
    perp_dex_app_id: UInt64  # Main DEX contract ID

    # Market data storage
    markets_box: BoxKey[Bytes]

    # Funding configuration
    default_base_rate: Int64  # Default base funding rate
    default_max_rate: Int64  # Default maximum funding rate
    default_interval: UInt64  # Default funding interval

    def __init__(self) -> None:
        """Initialize funding rate manager"""
        self.admin = Global.creator_address
        self.perp_dex_app_id = UInt64(0)  # To be set by admin

        # Default funding parameters
        self.default_base_rate = Int64(10)  # 0.01% per hour
        self.default_max_rate = Int64(1000)  # 1% per hour
        self.default_interval = UInt64(3600)  # 1 hour

    @arc4.abimethod
    def set_perp_dex_app_id(self, app_id: UInt64) -> None:
        """Set the main DEX contract ID (admin only)"""
        assert Txn.sender == self.admin, "Only admin can set DEX app ID"
        self.perp_dex_app_id = app_id

    @arc4.abimethod
    def initialize_market(
        self,
        symbol: String,
        base_funding_rate: Int64,
        max_funding_rate: Int64,
        funding_interval: UInt64
    ) -> None:
        """Initialize market parameters (admin only)"""
        assert Txn.sender == self.admin, "Only admin can initialize markets"

        market_data = MarketData(
            symbol=symbol,
            total_long_oi=UInt64(0),
            total_short_oi=UInt64(0),
            base_funding_rate=base_funding_rate,
            max_funding_rate=max_funding_rate,
            funding_interval=funding_interval
        )

        market_key = Bytes(b"market_") + symbol.bytes
        self.markets_box[market_key] = market_data.bytes

    @arc4.abimethod
    def update_open_interest(
        self,
        symbol: String,
        long_oi: UInt64,
        short_oi: UInt64
    ) -> None:
        """Update open interest data (DEX contract only)"""
        # Verify caller is the main DEX contract
        assert Txn.sender == Global.creator_address or Txn.applications[0] == self.perp_dex_app_id, "Unauthorized caller"

        market_key = Bytes(b"market_") + symbol.bytes
        market_data, exists = self.markets_box.maybe(market_key)

        if not exists:
            # Create default market if it doesn't exist
            market = MarketData(
                symbol=symbol,
                total_long_oi=long_oi,
                total_short_oi=short_oi,
                base_funding_rate=self.default_base_rate,
                max_funding_rate=self.default_max_rate,
                funding_interval=self.default_interval
            )
        else:
            market = MarketData.from_bytes(market_data)
            market.total_long_oi = long_oi
            market.total_short_oi = short_oi

        self.markets_box[market_key] = market.bytes

    @arc4.abimethod
    def calculate_funding_rate(self, symbol: String) -> Int64:
        """Calculate current funding rate for a market"""
        market_key = Bytes(b"market_") + symbol.bytes
        market_data, exists = self.markets_box.maybe(market_key)
        assert exists, "Market not initialized"

        market = MarketData.from_bytes(market_data)

        # Calculate open interest imbalance
        total_oi = market.total_long_oi + market.total_short_oi

        if total_oi == UInt64(0):
            return Int64(0)  # No funding if no open interest

        # Calculate imbalance ratio (-1 to 1)
        long_ratio = (Int64(market.total_long_oi) * Int64(10000)) // Int64(total_oi)
        imbalance_ratio = (long_ratio - Int64(5000)) // Int64(50)  # Scale to -100 to 100

        # Calculate funding rate based on imbalance
        # Positive rate means longs pay shorts, negative means shorts pay longs
        funding_rate = (market.base_funding_rate * imbalance_ratio) // Int64(100)

        # Cap funding rate at maximum
        if funding_rate > market.max_funding_rate:
            funding_rate = market.max_funding_rate
        elif funding_rate < -market.max_funding_rate:
            funding_rate = -market.max_funding_rate

        return funding_rate

    @arc4.abimethod
    def get_market_data(self, symbol: String) -> MarketData:
        """Get market data for a symbol"""
        market_key = Bytes(b"market_") + symbol.bytes
        market_data, exists = self.markets_box.maybe(market_key)
        assert exists, "Market not found"
        return MarketData.from_bytes(market_data)

    @arc4.abimethod
    def should_update_funding(self, symbol: String, last_update: UInt64) -> Bool:
        """Check if funding rate should be updated"""
        market_key = Bytes(b"market_") + symbol.bytes
        market_data, exists = self.markets_box.maybe(market_key)

        if not exists:
            return False

        market = MarketData.from_bytes(market_data)
        time_since_update = Global.latest_timestamp - last_update

        return time_since_update >= market.funding_interval

    @arc4.abimethod
    def update_market_params(
        self,
        symbol: String,
        base_rate: Int64,
        max_rate: Int64,
        interval: UInt64
    ) -> None:
        """Update market parameters (admin only)"""
        assert Txn.sender == self.admin, "Only admin can update market params"

        market_key = Bytes(b"market_") + symbol.bytes
        market_data, exists = self.markets_box.maybe(market_key)
        assert exists, "Market not found"

        market = MarketData.from_bytes(market_data)
        market.base_funding_rate = base_rate
        market.max_funding_rate = max_rate
        market.funding_interval = interval

        self.markets_box[market_key] = market.bytes

    @arc4.abimethod(readonly=True)
    def get_funding_info(self, symbol: String) -> Tuple[Int64, UInt64, UInt64]:
        """Get funding rate and open interest info"""
        funding_rate = self.calculate_funding_rate(symbol)
        market = self.get_market_data(symbol)

        return funding_rate, market.total_long_oi, market.total_short_oi

    @arc4.abimethod
    def set_default_params(
        self,
        base_rate: Int64,
        max_rate: Int64,
        interval: UInt64
    ) -> None:
        """Set default funding parameters (admin only)"""
        assert Txn.sender == self.admin, "Only admin can set default params"

        self.default_base_rate = base_rate
        self.default_max_rate = max_rate
        self.default_interval = interval