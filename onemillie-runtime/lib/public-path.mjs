// Vite supplies the deployment base; localhost retains '/'. External and blob
// URLs remain untouched so imported objects and music links keep working.
export function publicPath(url){
  if(!url.startsWith('/'))return url;
  return (import.meta.env?.BASE_URL||'/')+url.slice(1);
}
