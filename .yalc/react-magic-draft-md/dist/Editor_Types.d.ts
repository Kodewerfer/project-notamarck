export type TActivationReturn = {
    'enter'?: (ev: Event) => void | boolean | Promise<boolean>;
    'delJoining'?: (ev: Event) => void | boolean;
    'delOverride'?: (ev: Event) => void | boolean;
    'backspaceJoining'?: (ev: Event) => void | boolean;
    'backspaceOverride'?: (ev: Event) => void | boolean;
};
