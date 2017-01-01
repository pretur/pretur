import { get as lodashGet } from 'lodash';

export function get<
  T,
  K1 extends keyof T,
  K2 extends keyof T[K1],
  K3 extends keyof T[K1][K2],
  K4 extends keyof T[K1][K2][K3],
  K5 extends keyof T[K1][K2][K3][K4],
  K6 extends keyof T[K1][K2][K3][K4][K5],
  K7 extends keyof T[K1][K2][K3][K4][K5][K6],
  K8 extends keyof T[K1][K2][K3][K4][K5][K6][K7]
  >(
  obj: T, path1: K1, path2: K2, path3: K3, path4: K4, path5: K5, path6: K6, path7: K7, path8: K8,
): T[K1][K2][K3][K4][K5][K6][K7][K8];
export function get<
  T,
  K1 extends keyof T,
  K2 extends keyof T[K1],
  K3 extends keyof T[K1][K2],
  K4 extends keyof T[K1][K2][K3],
  K5 extends keyof T[K1][K2][K3][K4],
  K6 extends keyof T[K1][K2][K3][K4][K5],
  K7 extends keyof T[K1][K2][K3][K4][K5][K6]
  >(
  obj: T, path1: K1, path2: K2, path3: K3, path4: K4, path5: K5, path6: K6, path7: K7,
): T[K1][K2][K3][K4][K5][K6][K7];
export function get<
  T,
  K1 extends keyof T,
  K2 extends keyof T[K1],
  K3 extends keyof T[K1][K2],
  K4 extends keyof T[K1][K2][K3],
  K5 extends keyof T[K1][K2][K3][K4],
  K6 extends keyof T[K1][K2][K3][K4][K5]
  >(
  obj: T, path1: K1, path2: K2, path3: K3, path4: K4, path5: K5, path6: K6,
): T[K1][K2][K3][K4][K5][K6];
export function get<
  T,
  K1 extends keyof T,
  K2 extends keyof T[K1],
  K3 extends keyof T[K1][K2],
  K4 extends keyof T[K1][K2][K3],
  K5 extends keyof T[K1][K2][K3][K4]
  >(
  obj: T, path1: K1, path2: K2, path3: K3, path4: K4, path5: K5,
): T[K1][K2][K3][K4][K5];
export function get<
  T,
  K1 extends keyof T,
  K2 extends keyof T[K1],
  K3 extends keyof T[K1][K2],
  K4 extends keyof T[K1][K2][K3]
  >(
  obj: T, path1: K1, path2: K2, path3: K3, path4: K4,
): T[K1][K2][K3][K4];
export function get<T, K1 extends keyof T, K2 extends keyof T[K1], K3 extends keyof T[K1][K2]>(
  obj: T, path1: K1, path2: K2, path3: K3,
): T[K1][K2][K3];
export function get<T, K1 extends keyof T, K2 extends keyof T[K1]>(
  obj: T, path1: K1, path2: K2,
): T[K1][K2];
export function get<T, K1 extends keyof T>(obj: T, path: K1): T[K1];
export function get<T>(obj: T, ...paths: string[]): any {
  return lodashGet(obj, paths);
}
