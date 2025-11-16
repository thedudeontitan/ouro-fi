"""
Price Oracle Smart Contract for Algorand
Provides reliable price feeds for perpetual trading
"""

from algopy import *

class PriceData(Struct):
    """Structure for price data"""
    symbol: String
    price: UInt64  # Price with 8 decimal places
    timestamp: UInt64
    confidence: UInt64  # Confidence level (0-10000 basis points)

class PriceOracle(ARC4Contract):
    """
    Price Oracle Contract for perpetual DEX
    """

    # Global state
    admin: Account
    authorized_updaters: Mapping[Account, Bool]

    # Price data storage
    prices_box: BoxKey[Bytes]

    # Oracle configuration
    max_price_age: UInt64  # Maximum age of price data in seconds
    min_confidence: UInt64  # Minimum confidence required

    def __init__(self) -> None:
        """Initialize oracle contract"""
        self.admin = Global.creator_address
        self.max_price_age = UInt64(300)  # 5 minutes
        self.min_confidence = UInt64(8000)  # 80%

        # Add creator as authorized updater
        self.authorized_updaters[Global.creator_address] = True

    @arc4.abimethod
    def add_price_updater(self, updater: Account) -> None:
        """Add authorized price updater (admin only)"""
        assert Txn.sender == self.admin, "Only admin can add updaters"
        self.authorized_updaters[updater] = True

    @arc4.abimethod
    def remove_price_updater(self, updater: Account) -> None:
        """Remove authorized price updater (admin only)"""
        assert Txn.sender == self.admin, "Only admin can remove updaters"
        del self.authorized_updaters[updater]

    @arc4.abimethod
    def update_price(
        self,
        symbol: String,
        price: UInt64,
        confidence: UInt64
    ) -> None:
        """Update price for a symbol"""
        # Verify sender is authorized
        assert self.authorized_updaters.get(Txn.sender, False), "Unauthorized updater"

        # Verify confidence level
        assert confidence >= self.min_confidence, "Confidence too low"

        # Create price data
        price_data = PriceData(
            symbol=symbol,
            price=price,
            timestamp=Global.latest_timestamp,
            confidence=confidence
        )

        # Store price data
        price_key = Bytes(b"price_") + symbol.bytes
        self.prices_box[price_key] = price_data.bytes

    @arc4.abimethod
    def update_multiple_prices(
        self,
        symbols: StaticArray[String, Literal[10]],
        prices: StaticArray[UInt64, Literal[10]],
        confidences: StaticArray[UInt64, Literal[10]],
        count: UInt64
    ) -> None:
        """Update multiple prices in a single transaction"""
        assert self.authorized_updaters.get(Txn.sender, False), "Unauthorized updater"
        assert count <= UInt64(10), "Too many prices"

        for i in urange(count):
            symbol = symbols[i]
            price = prices[i]
            confidence = confidences[i]

            # Skip empty symbols
            if symbol == String(""):
                continue

            # Verify confidence
            assert confidence >= self.min_confidence, "Confidence too low"

            # Create and store price data
            price_data = PriceData(
                symbol=symbol,
                price=price,
                timestamp=Global.latest_timestamp,
                confidence=confidence
            )

            price_key = Bytes(b"price_") + symbol.bytes
            self.prices_box[price_key] = price_data.bytes

    @arc4.abimethod(readonly=True)
    def get_price(self, symbol: String) -> PriceData:
        """Get current price for symbol"""
        price_key = Bytes(b"price_") + symbol.bytes
        price_data, exists = self.prices_box.maybe(price_key)
        assert exists, "Price not found"

        price = PriceData.from_bytes(price_data)

        # Check if price is not too old
        age = Global.latest_timestamp - price.timestamp
        assert age <= self.max_price_age, "Price data too old"

        return price

    @arc4.abimethod(readonly=True)
    def get_price_unsafe(self, symbol: String) -> PriceData:
        """Get price without age verification"""
        price_key = Bytes(b"price_") + symbol.bytes
        price_data, exists = self.prices_box.maybe(price_key)
        assert exists, "Price not found"
        return PriceData.from_bytes(price_data)

    @arc4.abimethod(readonly=True)
    def is_price_fresh(self, symbol: String) -> Bool:
        """Check if price is fresh enough"""
        price_key = Bytes(b"price_") + symbol.bytes
        price_data, exists = self.prices_box.maybe(price_key)

        if not exists:
            return False

        price = PriceData.from_bytes(price_data)
        age = Global.latest_timestamp - price.timestamp
        return age <= self.max_price_age

    @arc4.abimethod
    def set_max_price_age(self, max_age: UInt64) -> None:
        """Set maximum price age (admin only)"""
        assert Txn.sender == self.admin, "Only admin can set max age"
        assert max_age > UInt64(0), "Invalid max age"
        self.max_price_age = max_age

    @arc4.abimethod
    def set_min_confidence(self, min_conf: UInt64) -> None:
        """Set minimum confidence level (admin only)"""
        assert Txn.sender == self.admin, "Only admin can set min confidence"
        assert min_conf <= UInt64(10000), "Invalid confidence level"
        self.min_confidence = min_conf

    @arc4.abimethod(readonly=True)
    def get_oracle_config(self) -> Tuple[UInt64, UInt64]:
        """Get oracle configuration"""
        return self.max_price_age, self.min_confidence