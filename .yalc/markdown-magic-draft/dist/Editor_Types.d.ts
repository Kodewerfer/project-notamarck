export type TActivationReturn = {
    'enter'?: (ev: Event) => void | boolean | Promise<boolean>;
    'delJoining'?: (ev: Event) => void | boolean | Promise<boolean>;
    'delOverride'?: (ev: Event) => void | boolean;
    'backspaceJoining'?: (ev: Event) => void | boolean | Promise<boolean>;
    'backspaceOverride'?: (ev: Event) => void | boolean;
    'element': HTMLElement | null;
};
