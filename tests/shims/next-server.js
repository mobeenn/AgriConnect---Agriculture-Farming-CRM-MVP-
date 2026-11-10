export class NextResponse extends Response {
  static json(data, init = {}) {
    const res = new NextResponse(JSON.stringify(data), { ...init, headers: { 'content-type': 'application/json' } });
    return res;
  }
  constructor(body, init) {
    super(body, init);
    this.cookies = { set: (name, value) => this.headers.append('set-cookie', `${name}=${value}`) };
  }
}
