/**
 * @file components/ui/index.ts
 * @description The shared UI kit. Pages build their layout from these
 * components instead of repeating class strings; the visual rules themselves
 * live once, in app/globals.css.
 */

export { cn } from './cn';
export { PageShell, PageHeader, Stamp } from './Page';
export { Card, CardHeader, CardTitle, CardSubtitle, CardBody, CardFooter, Panel } from './Card';
export { Button, ButtonLink, buttonClass } from './Button';
export { Notice, Tag, EmptyState, EmptyMark, EmptyTitle, EmptyBody, Skeleton } from './Feedback';
export { Label, FieldHint, Input, Select, Textarea, AffixField } from './Form';
export { ModalOverlay, Modal, ModalHeader, ModalBody, ModalFooter } from './Modal';
export { Heading, LinkTile, KpiGrid, KpiTile, Meter, WeightBar, Swatch } from './Display';
