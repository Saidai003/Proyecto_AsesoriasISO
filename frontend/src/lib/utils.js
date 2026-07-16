export function placeholderThumbnail(name = ''){
  const safe = String(name || '').slice(0,40)
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='90'><rect width='100%' height='100%' fill='%23e2e8f0'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='12' fill='%234a5568'>${safe}</text></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

export default { placeholderThumbnail }
