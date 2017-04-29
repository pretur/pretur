import preturFetch, { Method } from 'pretur.fetch';

export interface FetchOptions {
  url: string;
  method?: Method;
  body?: any;
  json?: boolean;
}

export interface FetchResponse<TBody> {
  body: TBody;
  ok: boolean;
  status: number;
  statusText: string;
}

export async function fetch<TBody>(options: FetchOptions): Promise<FetchResponse<TBody>> {
  const response = await preturFetch(options.url, {
    body: JSON.stringify(options.body),
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    method: options.method || 'GET',
  });

  const data = options.json
    ? await response.json<TBody>()
    : await response.text();

  return <FetchResponse<TBody>>{
    body: data,
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
  };
}
