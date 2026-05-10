
export function evaluateRules(rules, datetime = new Date()) {
  const day = datetime.getDay(), hour = datetime.getHours(), mins = datetime.getMinutes()
  const currentMins = hour * 60 + mins
  for (const rule of rules) {
    if (ruleAppliesNow(rule, day, currentMins)) return { ...rule, appliesNow: true }
  }
  return { type:'free', label:'Park for free', color:'#2ECC71', appliesNow:false }
}
function ruleAppliesNow(rule, day, currentMins) {
  if (rule.days && !rule.days.includes(day)) return false
  if (rule.startMins !== undefined && rule.endMins !== undefined) {
    if (rule.startMins <= rule.endMins) return currentMins >= rule.startMins && currentMins < rule.endMins
    return currentMins >= rule.startMins || currentMins < rule.endMins
  }
  return true
}
export function minsToTime(mins) {
  if (mins === undefined || mins === null) return null
  const h = Math.floor(mins / 60) % 24, m = mins % 60
  const ampm = h >= 12 ? 'PM' : 'AM', h12 = h % 12 || 12
  return `${h12}:${m.toString().padStart(2,'0')} ${ampm}`
}
export const RULE_COLORS = { free:'#2ECC71', paid:'#4A9EFF', permit:'#9B59B6', restricted:'#888888', loading:'#F39C12', carpark:'#F39C12' }
export const RULE_LABELS = { free:'Park for free', paid:'Pay to park', permit:'Permit only', restricted:'No parking', loading:'Loading only', carpark:'Car park' }
