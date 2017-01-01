import { set as lodashSet } from 'lodash';

export function set<
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
  obj: T, value: T[K1][K2][K3][K4][K5][K6][K7][K8],
  path1: K1, path2: K2, path3: K3, path4: K4, path5: K5, path6: K6, path7: K7, path8: K8,
): T;
export function set<
  T,
  K1 extends keyof T,
  K2 extends keyof T[K1],
  K3 extends keyof T[K1][K2],
  K4 extends keyof T[K1][K2][K3],
  K5 extends keyof T[K1][K2][K3][K4],
  K6 extends keyof T[K1][K2][K3][K4][K5],
  K7 extends keyof T[K1][K2][K3][K4][K5][K6]
  >(
  obj: T, value: T[K1][K2][K3][K4][K5][K6][K7],
  path1: K1, path2: K2, path3: K3, path4: K4, path5: K5, path6: K6, path7: K7,
): T;
export function set<
  T,
  K1 extends keyof T,
  K2 extends keyof T[K1],
  K3 extends keyof T[K1][K2],
  K4 extends keyof T[K1][K2][K3],
  K5 extends keyof T[K1][K2][K3][K4],
  K6 extends keyof T[K1][K2][K3][K4][K5]
  >(
  obj: T, value: T[K1][K2][K3][K4][K5][K6],
  path1: K1, path2: K2, path3: K3, path4: K4, path5: K5, path6: K6,
): T;
export function set<
  T,
  K1 extends keyof T,
  K2 extends keyof T[K1],
  K3 extends keyof T[K1][K2],
  K4 extends keyof T[K1][K2][K3],
  K5 extends keyof T[K1][K2][K3][K4]
  >(
  obj: T, value: T[K1][K2][K3][K4][K5], path1: K1, path2: K2, path3: K3, path4: K4, path5: K5,
): T;
export function set<
  T,
  K1 extends keyof T,
  K2 extends keyof T[K1],
  K3 extends keyof T[K1][K2],
  K4 extends keyof T[K1][K2][K3]
  >(
  obj: T, value: T[K1][K2][K3][K4], path1: K1, path2: K2, path3: K3, path4: K4,
): T;
export function set<T, K1 extends keyof T, K2 extends keyof T[K1], K3 extends keyof T[K1][K2]>(
  obj: T, value: T[K1][K2][K3], path1: K1, path2: K2, path3: K3,
): T;
export function set<T, K1 extends keyof T, K2 extends keyof T[K1]>(
  obj: T, value: T[K1][K2], path1: K1, path2: K2,
): T;
export function set<T, K1 extends keyof T>(obj: T, value: T[K1], path: K1): T;
export function set<T>(obj: T, value: any, ...paths: string[]): T {
  return lodashSet<T>(obj, paths, value);
}
