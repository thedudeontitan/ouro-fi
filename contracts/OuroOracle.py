"""
Ouro Finance - Price Oracle Smart Contract

Based on the Sway Oracle reference implementation, this contract provides:
- Secure price feed management
- Owner-controlled price updates
- Multi-asset price support
- Price validation and confidence scoring
"""

from algopy import *


@struct
class PriceData:
    """Price data structure with metadata"""
    price: UInt64              # Asset price (8 decimals)
    confidence: UInt64         # Price confidence score (0-100)
    timestamp: UInt64          # Last update timestamp
    symbol: String             # Asset symbol (e.g., "ETHUSD")
    publisher: Account         # Price publisher address


@struct
class OracleConfig:
    """Oracle configuration parameters"""
    owner: Account             # Oracle owner/admin
    max_price_age: UInt64     # Maximum allowed price age (seconds)
    min_confidence: UInt64    # Minimum required confidence
    authorized_publishers: Bytes  # Bitmap of authorized publishers


class OuroOracle(ARC4Contract):
    """
    Price Oracle contract for Ouro Finance DEX
    Manages secure price feeds for trading pairs
    """

    def __init__(self) -> None:
        """Initialize oracle with owner"""
        self.config = OracleConfig(
            owner=Txn.sender,
            max_price_age=UInt64(300),      # 5 minutes
            min_confidence=UInt64(80),       # 80% minimum confidence
            authorized_publishers=Bytes()
        )

    @abimethod
    def set_price(
        self,
        symbol: String,
        price: UInt64,
        confidence: UInt64
    ) -> None:
        """
        Set price for an asset (owner only)
        Equivalent to Sway set_price function
        """
        publisher = Txn.sender

        # Verify authorization (owner or authorized publisher)
        assert (
            publisher == self.config.owner or
            self._is_authorized_publisher(publisher)
        ), "Not authorized to set price"

        # Validate price data
        assert price > 0, "Price must be positive"
        assert confidence <= 100, "Invalid confidence score"
        assert confidence >= self.config.min_confidence, "Confidence too low"

        # Create price data
        price_data = PriceData(
            price=price,
            confidence=confidence,
            timestamp=Global.latest_timestamp,
            symbol=symbol,
            publisher=publisher
        )

        # Store in box storage
        price_key = self._get_price_key(symbol)
        app.box_put(price_key, price_data)

        # Emit price update event
        log(
            Bytes(b"price_update:") +
            symbol.bytes +
            Bytes(b":") +
            op.itob(price) +
            Bytes(b":") +
            op.itob(confidence)
        )

    @abimethod(readonly=True)
    def price(self, symbol: String) -> UInt64:
        """
        Get current price for asset
        Matches Sway price function interface
        """
        price_data = self._get_price_data(symbol)

        # Validate price freshness
        price_age = Global.latest_timestamp - price_data.timestamp
        assert price_age <= self.config.max_price_age, "Price data stale"

        return price_data.price

    @abimethod(readonly=True)
    def get_price_data(self, symbol: String) -> PriceData:
        """Get full price data including metadata"""
        return self._get_price_data(symbol)

    @abimethod(readonly=True)
    def get_price_with_confidence(self, symbol: String) -> (UInt64, UInt64):
        """Get price and confidence score"""
        price_data = self._get_price_data(symbol)
        return price_data.price, price_data.confidence

    @abimethod
    def add_authorized_publisher(self, publisher: Account) -> None:
        """Add authorized price publisher (owner only)"""
        assert Txn.sender == self.config.owner, "Only owner can add publishers"

        # Store publisher in box storage
        pub_key = self._get_publisher_key(publisher)
        app.box_put(pub_key, Bytes(b"authorized"))

        log(Bytes(b"publisher_added:") + publisher.bytes)

    @abimethod
    def remove_authorized_publisher(self, publisher: Account) -> None:
        """Remove authorized price publisher (owner only)"""
        assert Txn.sender == self.config.owner, "Only owner can remove publishers"

        # Remove publisher from storage
        pub_key = self._get_publisher_key(publisher)
        app.box_delete(pub_key)

        log(Bytes(b"publisher_removed:") + publisher.bytes)

    @abimethod
    def set_oracle_config(
        self,
        max_price_age: UInt64,
        min_confidence: UInt64
    ) -> None:
        """Update oracle configuration (owner only)"""
        assert Txn.sender == self.config.owner, "Only owner can update config"

        assert max_price_age > 0, "Invalid price age"
        assert min_confidence <= 100, "Invalid confidence"

        self.config = OracleConfig(
            owner=self.config.owner,
            max_price_age=max_price_age,
            min_confidence=min_confidence,
            authorized_publishers=self.config.authorized_publishers
        )

    @abimethod
    def transfer_ownership(self, new_owner: Account) -> None:
        """Transfer oracle ownership (owner only)"""
        assert Txn.sender == self.config.owner, "Only owner can transfer ownership"

        self.config = OracleConfig(
            owner=new_owner,
            max_price_age=self.config.max_price_age,
            min_confidence=self.config.min_confidence,
            authorized_publishers=self.config.authorized_publishers
        )

        log(Bytes(b"ownership_transferred:") + new_owner.bytes)

    @abimethod
    def batch_update_prices(
        self,
        symbols: String,  # Comma-separated symbols
        prices: String,   # Comma-separated prices
        confidences: String  # Comma-separated confidence scores
    ) -> None:
        """
        Update multiple prices in a single transaction
        Efficient for high-frequency updates
        """
        publisher = Txn.sender

        # Verify authorization
        assert (
            publisher == self.config.owner or
            self._is_authorized_publisher(publisher)
        ), "Not authorized"

        # Parse and update prices
        # Note: In production, would implement proper CSV parsing
        # For now, this is a placeholder for batch functionality

        log(Bytes(b"batch_update:") + symbols.bytes)

    @abimethod(readonly=True)
    def owner(self) -> Account:
        """
        Get oracle owner
        Matches Sway owner function
        """
        return self.config.owner

    @abimethod(readonly=True)
    def get_config(self) -> OracleConfig:
        """Get current oracle configuration"""
        return self.config

    @abimethod(readonly=True)
    def is_price_fresh(self, symbol: String) -> bool:
        """Check if price data is within acceptable age"""
        try:
            price_data = self._get_price_data(symbol)
            price_age = Global.latest_timestamp - price_data.timestamp
            return price_age <= self.config.max_price_age
        except:
            return False

    @abimethod(readonly=True)
    def get_supported_assets(self) -> String:
        """Get comma-separated list of supported assets"""
        # In production, maintain a list of supported symbols
        return String("ETHUSD,BTCUSD,SOLUSD,ALGOUSD")

    # Internal helper functions

    def _get_price_data(self, symbol: String) -> PriceData:
        """Get price data from storage"""
        price_key = self._get_price_key(symbol)
        price_data_bytes, exists = app.box_get(price_key)
        assert exists, "Price not found"
        return PriceData.from_bytes(price_data_bytes)

    def _is_authorized_publisher(self, publisher: Account) -> bool:
        """Check if account is authorized to publish prices"""
        pub_key = self._get_publisher_key(publisher)
        _, exists = app.box_get(pub_key)
        return exists

    def _get_price_key(self, symbol: String) -> Bytes:
        """Generate box key for price storage"""
        return Bytes(b"price_") + symbol.bytes

    def _get_publisher_key(self, publisher: Account) -> Bytes:
        """Generate box key for publisher authorization"""
        return Bytes(b"pub_") + publisher.bytes

    def _validate_price_update(self, symbol: String, price: UInt64, confidence: UInt64) -> bool:
        """Validate price update parameters"""
        if price == 0:
            return False
        if confidence > 100:
            return False
        if confidence < self.config.min_confidence:
            return False
        return True