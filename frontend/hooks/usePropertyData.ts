/**
 * Backward compatibility adapter for usePropertyData
 * Re-exports useProperty as usePropertyData to maintain existing imports
 * 
 * MIGRATED TO MULTICALL - See hooks/useProperty.ts for new implementation
 */

export { useProperty as usePropertyData, useProperties } from './useProperty'
export type { PropertyData, PropertyFullData } from './useProperty'








