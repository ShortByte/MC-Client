export interface With {
  text?: string;
  translate?: string;
  clickEvent?: ClickEvent;
  hoverEvent?: HoverEvent;
  with: With[];
}

export interface Extra {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underlined?: boolean;
  strikethrough?: boolean;
  obfuscated?: boolean;
  color?: string;
  extra: Extra[];
}

export interface ClickEvent {
  action: string;
  value: string;
}

export interface HoverEvent {
  action: string;
  contents: {
    type: string,
    id: string,
    name?: {
      text: string
    }
  }
}

export interface JsonMessage {
  with: With[];
  extra: Extra[];
  bold?: boolean;
  italic?: boolean;
  underlined?: boolean;
  strikethrough?: boolean;
  obfuscated?: boolean;
  color?: string;
  text?: string;
  font?: string;
  translate?: string;
  insertion?: string;
  keybind?: string;
  score?: {
    name: string,
    objective: string
  };
  clickEvent?: ClickEvent;
  hoverEvent?: HoverEvent;
}