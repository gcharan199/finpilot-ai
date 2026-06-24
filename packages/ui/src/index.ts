/**
 * @finpilot/ui — NativeWind design system for FinPilot AI.
 *
 * A small shadcn-inspired React Native component set + Skia/Victory chart
 * wrappers, themed by a single tokens file. Consumed as source by the Expo
 * app's Metro (no build step); verified via typecheck + the app's expo export.
 */

// Theme
export * from "./theme/tokens";
export { ThemeProvider, useTheme, type ThemeContextValue } from "./lib/ThemeProvider";
export { cn } from "./lib/cn";

// Components
export { Text, Heading, type TextProps } from "./components/Text";
export { Button, type ButtonProps } from "./components/Button";
export { Card, CardHeader, type CardProps } from "./components/Card";
export { Input, type InputProps } from "./components/Input";
export { Screen, type ScreenProps } from "./components/Screen";
export { Badge, type BadgeProps } from "./components/Badge";
export { ProgressRing, type ProgressRingProps } from "./components/ProgressRing";
export { ListItem, type ListItemProps } from "./components/ListItem";
export { Sheet, Modal, type SheetProps } from "./components/Sheet";
export { Tabs, type TabItem, type TabsProps } from "./components/Tabs";

// Charts
export { DonutChart, type DonutChartProps, type DonutDatum } from "./charts/DonutChart";
export { BarChart, type BarChartProps, type BarDatum } from "./charts/BarChart";
export { LineChart, type LineChartProps, type LineDatum } from "./charts/LineChart";
