function series(s, n) {
  let r = 0;
  for (let i = 0; i <= n; i += 1) {
    r += s(i);
  }
  return r;
}
export default series;
