import { setWith } from 'lodash';

export type SetCustomizer = (nsValue: any, key: string, nsObject: any) => any;

export function setCustomized<
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
  obj: T, value: T[K1][K2][K3][K4][K5][K6][K7][K8], customizer: SetCustomizer,
  path1: K1, path2: K2, path3: K3, path4: K4, path5: K5, path6: K6, path7: K7, path8: K8,
): T;
export function setCustomized<
  T,
  K1 extends keyof T,
  K2 extends keyof T[K1],
  K3 extends keyof T[K1][K2],
  K4 extends keyof T[K1][K2][K3],
  K5 extends keyof T[K1][K2][K3][K4],
  K6 extends keyof T[K1][K2][K3][K4][K5],
  K7 extends keyof T[K1][K2][K3][K4][K5][K6]
  >(
  obj: T, value: T[K1][K2][K3][K4][K5][K6][K7], customizer: SetCustomizer,
  path1: K1, path2: K2, path3: K3, path4: K4, path5: K5, path6: K6, path7: K7,
): T;
export function setCustomized<
  T,
  K1 extends keyof T,
  K2 extends keyof T[K1],
  K3 extends keyof T[K1][K2],
  K4 extends keyof T[K1][K2][K3],
  K5 extends keyof T[K1][K2][K3][K4],
  K6 extends keyof T[K1][K2][K3][K4][K5]
  >(
  obj: T, value: T[K1][K2][K3][K4][K5][K6], customizer: SetCustomizer,
  path1: K1, path2: K2, path3: K3, path4: K4, path5: K5, path6: K6,
): T;
export function setCustomized<
  T,
  K1 extends keyof T,
  K2 extends keyof T[K1],
  K3 extends keyof T[K1][K2],
  K4 extends keyof T[K1][K2][K3],
  K5 extends keyof T[K1][K2][K3][K4]
  >(
  obj: T, value: T[K1][K2][K3][K4][K5], customizer: SetCustomizer,
  path1: K1, path2: K2, path3: K3, path4: K4, path5: K5,
): T;
export function setCustomized<
  T,
  K1 extends keyof T,
  K2 extends keyof T[K1],
  K3 extends keyof T[K1][K2],
  K4 extends keyof T[K1][K2][K3]
  >(
  obj: T, value: T[K1][K2][K3][K4], customizer: SetCustomizer,
  path1: K1, path2: K2, path3: K3, path4: K4,
): T;
export function setCustomized<
  T,
  K1 extends keyof T,
  K2 extends keyof T[K1],
  K3 extends keyof T[K1][K2]
  >(
  obj: T, value: T[K1][K2][K3], customizer: SetCustomizer, path1: K1, path2: K2, path3: K3,
): T;
export function setCustomized<T, K1 extends keyof T, K2 extends keyof T[K1]>(
  obj: T, value: T[K1][K2], customizer: SetCustomizer, path1: K1, path2: K2,
): T;
export function setCustomized<T, K1 extends keyof T>(
  obj: T, value: T[K1], customizer: SetCustomizer, path: K1,
): T;
export function setCustomized<T>(
  obj: T, value: any, customizer: SetCustomizer, ...paths: string[],
): T {
  return setWith(<any>obj, paths, value, customizer);
}
