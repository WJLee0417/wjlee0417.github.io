// Limited MySQL CREATE/ALTER syntax used by the pinned portfolio schemas.
// Balanced scanning preserves commas in DECIMAL, composite keys and CHECK expressions.
export function splitSqlList(text) {
  const parts=[];let depth=0,quote='',start=0;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(quote){if(c===quote && text[i-1]!=='\\')quote='';continue;}
    if("'\"`".includes(c)){quote=c;continue;}
    if(c==='(')depth++;if(c===')')depth--;
    if(c===',' && depth===0){parts.push(text.slice(start,i).trim());start=i+1;}
  }
  parts.push(text.slice(start).trim());return parts.filter(Boolean);
}
const names=text=>splitSqlList(text).map(name=>name.replaceAll('`','').trim());
export function parseSchema(sql) {
  const clean=sql.replace(/--[^\r\n]*/g,''),tables=[];
  const create=/CREATE\s+TABLE\s+`?([^`\s(]+)`?\s*\(/gi;let match;
  while((match=create.exec(clean))){
    let end=create.lastIndex,depth=1,quote='';
    for(;end<clean.length && depth;end++){
      const c=clean[end];if(quote){if(c===quote && clean[end-1]!=='\\')quote='';continue;}
      if("'\"`".includes(c))quote=c;else if(c==='(')depth++;else if(c===')')depth--;
    }
    if(depth)throw new Error('Unclosed table '+match[1]);
    const table={name:match[1],label:match[1],columns:[],primaryKey:[],uniqueKeys:[],foreignKeys:[]};
    for(const item of splitSqlList(clean.slice(create.lastIndex,end-1))){
      const primary=item.match(/^PRIMARY\s+KEY\s*\(([^)]+)\)/i);
      const unique=item.match(/^(?:CONSTRAINT\s+`?[^`\s]+`?\s+)?UNIQUE(?:\s+(?:KEY|INDEX)\s+`?[^`\s(]+`?)?\s*\(([^)]+)\)/i);
      const foreign=item.match(/FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+`?([^`\s(]+)`?\s*\(([^)]+)\)/i);
      if(primary){table.primaryKey=names(primary[1]);continue;}
      if(unique){table.uniqueKeys.push(names(unique[1]));continue;}
      if(foreign){table.foreignKeys.push({columns:names(foreign[1]),target:foreign[2],targetColumns:names(foreign[3])});continue;}
      if(/^(?:CONSTRAINT|CHECK|KEY|INDEX)\b/i.test(item))continue;
      const column=item.match(/^`?([^`\s]+)`?\s+([A-Z]+(?:\s*\([^)]*\))?(?:\s+UNSIGNED)?)(.*)$/i);
      if(!column)throw new Error('Unsupported column '+table.name+': '+item);
      const inlinePrimary=/\bPRIMARY\s+KEY\b/i.test(column[3]);
      table.columns.push({name:column[1],type:column[2].toUpperCase(),nullable:!inlinePrimary && !/\bNOT\s+NULL\b/i.test(column[3])});
      if(inlinePrimary)table.primaryKey.push(column[1]);
      if(/\bUNIQUE\b/i.test(column[3]))table.uniqueKeys.push([column[1]]);
    }
    for(const name of table.primaryKey){const column=table.columns.find(column=>column.name===name);if(column)column.nullable=false;}
    tables.push(table);create.lastIndex=end;
  }
  const modify=/ALTER\s+TABLE\s+`?([^`\s]+)`?\s+MODIFY\s+`?([^`\s]+)`?\s+([A-Z]+(?:\([^)]*\))?(?:\s+UNSIGNED)?)\s+(NULL|NOT\s+NULL)/gi;
  while((match=modify.exec(clean))){const column=tables.find(table=>table.name===match[1])?.columns.find(column=>column.name===match[2]);if(!column)throw new Error('Unknown ALTER column');column.type=match[3].toUpperCase();column.nullable=match[4].toUpperCase()==='NULL';}
  return tables;
}
