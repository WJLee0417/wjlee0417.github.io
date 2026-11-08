import type { SchemaTable } from './data';

/** Preserve every key; use domain fields before audit timestamps in the compact view. */
export function overviewColumns(table:SchemaTable,all=false){
  const keys=new Set([...table.primaryKey,...table.foreignKeys.flatMap(key=>key.columns)]);
  const attributes=table.columns.filter(column=>!keys.has(column.name));
  const primaryAttributes=attributes.filter(column=>!['created_at','updated_at'].includes(column.name));
  const shown=new Set((primaryAttributes.length?primaryAttributes:attributes).slice(0,3).map(column=>column.name));
  return table.columns.filter(column=>all||keys.has(column.name)||shown.has(column.name));
}
