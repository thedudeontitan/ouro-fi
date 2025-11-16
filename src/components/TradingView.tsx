import { memo, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface TradingViewWidgetProps {
  symbol: string;
  onIntervalChange?: (interval: string) => void;
}

function TradingViewWidget({ symbol, onIntervalChange }: TradingViewWidgetProps) {
  const container = useRef<HTMLDivElement>(null);
  const scriptLoaded = useRef(false);
  const [selectedInterval, setSelectedInterval] = useState("30m");

  const timeframes = [
    { label: "1m", value: "1" },
    { label: "5m", value: "5" },
    { label: "15m", value: "15" },
    { label: "30m", value: "30" },
    { label: "1hr", value: "60" },
    { label: "4hr", value: "240" },
    { label: "D", value: "1D" }
  ];

  const handleIntervalChange = (interval: string, label: string) => {
    setSelectedInterval(label);
    onIntervalChange?.(interval);
    // Reload the widget with new interval
    if (container.current) {
      container.current.innerHTML = '';
      scriptLoaded.current = false;
      loadWidget(interval);
    }
  };

  const loadWidget = (interval: string = "30") => {
    if (scriptLoaded.current || !container.current) return;

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = `
      {
          "autosize": true,
          "width": "100%",
          "height": "100%",
          "symbol": "${symbol}",
          "interval": "${interval}",
          "timezone": "Etc/UTC",
          "theme": "dark",
          "style": "1",
          "locale": "en",
          "borderColor": "#242931",
          "backgroundColor": "#242931",
          "gridColor": "rgba(42, 46, 57, 0)",
          "hide_top_toolbar": true,
          "withdateranges": false,
          "hide_legend": true,
          "allow_symbol_change": false,
          "calendar": false,
          "studies": [],
          "hide_volume": true,
          "hide_side_toolbar": true,
          "details": false,
          "hotlist": false,
          "enable_publishing": false,
          "hide_idea_button": true,
          "hide_share_button": true,
          "save_image": false,
          "toolbar_bg": "#242931",
          "container_id": "pricechart_tv",
          "show_popup_button": false,
          "popup_width": "1000",
          "popup_height": "650",
          "no_referral_id": true,
          "overrides": {
            "paneProperties.background": "#242931",
            "paneProperties.backgroundType": "solid",
            "scalesProperties.backgroundColor": "#242931",
            "scalesProperties.lineColor": "rgba(42, 46, 57, 0)",
            "scalesProperties.textColor": "#d8dee9",
            "mainSeriesProperties.candleStyle.upColor": "#a3be8c",
            "mainSeriesProperties.candleStyle.downColor": "#bf616a",
            "mainSeriesProperties.candleStyle.borderUpColor": "#a3be8c",
            "mainSeriesProperties.candleStyle.borderDownColor": "#bf616a",
            "mainSeriesProperties.candleStyle.wickUpColor": "#a3be8c",
            "mainSeriesProperties.candleStyle.wickDownColor": "#bf616a"
          },
          "support_host": "https://www.tradingview.com"
        }`;
    container.current.appendChild(script);
    scriptLoaded.current = true;
  };

  useEffect(() => {
    // Clear previous widget
    if (container.current) {
      container.current.innerHTML = '';
    }
    scriptLoaded.current = false;

    // Small delay to ensure cleanup is complete
    const timer = setTimeout(() => {
      loadWidget();
    }, 100);

    return () => {
      clearTimeout(timer);
      if (container.current) {
        container.current.innerHTML = '';
      }
      scriptLoaded.current = false;
    };
  }, [symbol]);

  return (
    <div className="relative flex h-full w-full flex-col">
      {/* Timeframe Header */}
      <motion.div
        className="flex h-9 items-center justify-between px-4 mb-2"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex gap-0.5">
          {timeframes.map((tf, index) => (
            <motion.button
              key={tf.label}
              onClick={() => handleIntervalChange(tf.value, tf.label)}
              className={`inline-flex select-none items-center justify-center whitespace-nowrap rounded-[10px] font-semibold outline-none transition-colors active:opacity-80 h-8 text-xs leading-none px-2 md:px-3 md:h-9 md:text-sm md:leading-none ${
                selectedInterval === tf.label
                  ? 'text-white'
                  : ''
              }`}
              style={{
                backgroundColor: selectedInterval === tf.label
                  ? '#5e81ac'
                  : 'transparent',
                color: selectedInterval === tf.label
                  ? '#eceff4'
                  : '#d8dee9'
              }}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
            >
              {tf.label}
            </motion.button>
          ))}
        </div>

        {/* Settings Button */}
        <motion.button
          className="inline-flex select-none items-center justify-center whitespace-nowrap rounded-[10px] font-semibold outline-none transition-shadow h-8 w-8 px-0 text-sm leading-none md:hidden"
          style={{ color: '#d8dee9' }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" height="1rem" width="1rem">
            <path fill="none" d="M0 0h24v24H0V0z"></path>
            <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"></path>
          </svg>
        </motion.button>
      </motion.div>

      {/* Chart Container */}
      <motion.div
        id="pricechart_tv"
        className="w-full flex-1"
        ref={container}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <div className="tradingview-widget-container__widget rounded h-full"></div>
      </motion.div>
    </div>
  );
}

export default memo(TradingViewWidget);
