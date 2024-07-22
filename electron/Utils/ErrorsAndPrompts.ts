import { dialog } from 'electron';

// used in API that can't throw to renderer side
export function ShowErrorAlert(Message: string, details?: string | undefined) {
  return dialog.showMessageBoxSync({
    type: 'error',
    message: Message,
    detail: details,
  });
}

// used in API that can't throw to renderer side
export function ShowConfirmAlert(Message: string, details?: string | undefined) {
  return dialog.showMessageBoxSync({
    type: 'question',
    message: Message,
    detail: details,
    buttons: ['yes', 'no'],
  });
}
