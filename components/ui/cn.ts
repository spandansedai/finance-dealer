/**
 * @file components/ui/cn.ts
 * @description Joins class names, skipping empty and falsy values.
 */

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Props for a component that renders as a configurable HTML element
 * (`as="section"`, `as="form"`, …) and forwards every other prop to it.
 */
export type PolymorphicProps<E extends React.ElementType> = {
  as?: E;
} & Omit<React.ComponentPropsWithoutRef<E>, 'as'>;
