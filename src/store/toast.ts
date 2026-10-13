import { create } from 'zustand';

type Tone = 'info' | 'error';
type Action = 'settings';

type ToastState = { id: number; title: string | null; message: string | null; tone: Tone; action: Action | null };

export const useToast = create<ToastState>(() => ({ id: 0, title: null, message: null, tone: 'info', action: null }));

/**
 * A problem worded for the person using the app: a short title saying what is wrong, a line saying
 * what to do about it, and optionally a button that takes them there.
 */
export class UserError extends Error {
  title: string;
  action: Action | null;

  constructor(title: string, message: string, action: Action | null = null) {
    super(message);
    this.title = title;
    this.action = action;
  }
}

export function toast(message: string, tone: Tone = 'info') {
  useToast.setState((s) => ({ id: s.id + 1, title: null, message, tone, action: null }));
}

export function toastError(error: unknown) {
  const known = error instanceof UserError;
  useToast.setState((s) => ({
    id: s.id + 1,
    title: known ? error.title : 'Something went wrong',
    message: known ? error.message : 'Please try again.',
    tone: 'error',
    action: known ? error.action : null,
  }));
  if (!known) console.warn(error);
}

export function dismissToast() {
  useToast.setState({ title: null, message: null, action: null });
}
