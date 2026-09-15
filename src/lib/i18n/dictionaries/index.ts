import { navigation } from './navigation';
import { common } from './common';
import { principal } from './principal';
import { bursar } from './bursar';
import { superManager } from './superManager';
import { teacher } from './teacher';
import { vicePrincipal } from './vicePrincipal';
import { parentStudent } from './parentStudent';
import { discipline } from './discipline';
import { hod } from './hod';
import { manager } from './manager';
import { misc } from './misc';
import { components } from './components';

// Order matters only when the same key exists in multiple dictionaries.
// Later entries win — role-specific translations can override common ones
// if a term needs to read differently in a specific role's screens.
export const dictionary: Record<string, string> = {
  ...common,
  ...navigation,
  ...components,
  ...principal,
  ...bursar,
  ...superManager,
  ...teacher,
  ...vicePrincipal,
  ...parentStudent,
  ...discipline,
  ...hod,
  ...manager,
  ...misc,
};
