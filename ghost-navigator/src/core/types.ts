export type ElementAction = "click" | "focus" | "toggle" | "navigate" | "expand" | "scroll-to";

export interface ParsedElement {
  text: string;
  icon: string;
  category: string;
  action: ElementAction;
  hidden: boolean;
  el: HTMLElement;
}

export interface BuiltinCommand {
  keyword: string;
  aliases: string[];
  action: string;
  icon: string;
  label: string;
  description: string;
}
