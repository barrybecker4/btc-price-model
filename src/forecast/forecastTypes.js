/**
 * @typedef {'24h' | '168h'} ForecastHorizonKey
 */

/**
 * @typedef {Object} DailyClosePoint
 * @property {number} timestampMs
 * @property {number} price
 */

/**
 * @typedef {Object} FearGreedPoint
 * @property {number} timestampMs
 * @property {number} value
 * @property {string} classification
 */

/**
 * @typedef {Object} CoinGeckoGlobalSnapshot
 * @property {number} btcDominancePct
 * @property {number} marketCapChangePct24h
 */

/**
 * @typedef {'dovish' | 'neutral' | 'hawkish'} FedStance
 * @typedef {'cut' | 'hold' | 'hike' | 'uncertain'} ExpectedNextMove
 */

/**
 * @typedef {Object} FedPolicySnapshot
 * @property {number} fundsRateLower
 * @property {number} fundsRateUpper
 * @property {FedStance} stance
 * @property {ExpectedNextMove} expectedNextMove
 * @property {string} lastUpdated
 * @property {string} [sourceNote]
 */

/**
 * @typedef {Object} FomcMeetingContext
 * @property {boolean} isFomcWeek
 * @property {number | null} daysToNextDecision
 * @property {string | null} nextDecisionDate
 * @property {FedPolicySnapshot} policy
 */

/**
 * @typedef {Object} ForecastFeatureBundle
 * @property {number | null} spotUsd
 * @property {DailyClosePoint[]} btcDaily
 * @property {DailyClosePoint[]} spyDaily
 * @property {FearGreedPoint[]} fearGreed
 * @property {CoinGeckoGlobalSnapshot | null} globalCrypto
 * @property {FomcMeetingContext} fomc
 * @property {string[]} degradedFeatures
 * @property {number} fetchedAtMs
 */

/**
 * @typedef {Object} FeatureVector
 * @property {number} spotUsd
 * @property {number} rBtc1d
 * @property {number} rBtc7d
 * @property {number} rBtc30d
 * @property {number} volBtc7d
 * @property {number} volBtc30d
 * @property {number} rSpy1d
 * @property {number} rSpy7d
 * @property {number} volSpy30d
 * @property {number | null} fearGreed
 * @property {number | null} fearGreedDelta7d
 * @property {number | null} btcDominance
 * @property {number | null} dominanceDelta30d
 * @property {boolean} isFomcWeek
 * @property {number | null} daysToDecision
 * @property {FedStance} fedStance
 * @property {ExpectedNextMove} expectedNextMove
 * @property {string[]} degradedFeatures
 * @property {number} fetchedAtMs
 */

/**
 * @typedef {Object} LogNormalComponent
 * @property {number} mu
 * @property {number} sigma
 * @property {number} [weight]
 */

/**
 * @typedef {Object} HorizonDistributionParams
 * @property {number} mu
 * @property {number} sigma
 * @property {boolean} mixtureActive
 * @property {LogNormalComponent} [base]
 * @property {LogNormalComponent} [stress]
 * @property {number} [stressWeight]
 */

/**
 * @typedef {Object} PdfPoint
 * @property {number} price
 * @property {number} density
 */

/**
 * @typedef {Object} HorizonPdf
 * @property {ForecastHorizonKey} horizon
 * @property {number} horizonHours
 * @property {PdfPoint[]} pdf
 * @property {number} spotUsd
 * @property {number} median
 * @property {number} mean
 * @property {number} p10
 * @property {number} p90
 * @property {number} probUp
 * @property {number} probDown5Pct
 * @property {boolean} mixtureActive
 */

/**
 * @typedef {Object} NarrativeFactor
 * @property {string} id
 * @property {number} weight
 * @property {string} text
 */

/**
 * @typedef {Object} ForecastNarrative
 * @property {string} headline
 * @property {NarrativeFactor[]} factors
 * @property {string[]} warnings
 * @property {string} horizonComparison
 * @property {string} disclaimer
 */

/**
 * @typedef {Object} ContextRibbonPoint
 * @property {number} simPrice7d
 * @property {number} powerLawTrend
 * @property {number} powerLawLower
 * @property {number} powerLawUpper
 * @property {number} forecastMedian168h
 */

/**
 * @typedef {Object} SimContext
 * @property {number} spotPrice
 * @property {{ year: number, price: number }} simFirstRow
 * @property {{ year: number, price: number }[]} simRows
 * @property {number} yearStart
 */

/**
 * @typedef {Object} ForecastResult
 * @property {number} spotUsd
 * @property {number} generatedAtMs
 * @property {FeatureVector} features
 * @property {HorizonPdf} horizon24h
 * @property {HorizonPdf} horizon168h
 * @property {ForecastNarrative} narrative
 * @property {ContextRibbonPoint | null} contextRibbon
 * @property {FedPolicySnapshot} fedPolicy
 */

export {};
