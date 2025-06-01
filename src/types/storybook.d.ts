// Type declarations for Storybook (when not installed)
declare module '@storybook/vue3' {
  export interface Meta {
    title: string;
    component: any;
    argTypes?: Record<string, any>;
  }
  
  export interface StoryObj {
    args?: Record<string, any>;
    render?: (args: any) => any;
  }
  
  export type Story = StoryObj;
}

declare module '@storybook/addon-actions' {
  export function action(name: string): (...args: any[]) => void;
}