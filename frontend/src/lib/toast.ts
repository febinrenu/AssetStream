export type ToastVariant = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
}

type Listener = (toasts: ToastItem[]) => void;

class ToastEmitter {
  private items: ToastItem[] = [];
  private listeners = new Set<Listener>();
  private counter = 0;

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn([...this.items]);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    const snap = [...this.items];
    this.listeners.forEach((fn) => fn(snap));
  }

  add(title: string, variant: ToastVariant, description?: string) {
    const id = ++this.counter;
    this.items = [...this.items, { id, title, description, variant }];
    this.emit();
    if (typeof window !== "undefined") {
      setTimeout(() => this.remove(id), 4500);
    }
  }

  remove(id: number) {
    this.items = this.items.filter((t) => t.id !== id);
    this.emit();
  }
}

export const toastEmitter = new ToastEmitter();

export const toast = {
  success: (title: string, description?: string) =>
    toastEmitter.add(title, "success", description),
  error: (title: string, description?: string) =>
    toastEmitter.add(title, "error", description),
  info: (title: string, description?: string) =>
    toastEmitter.add(title, "info", description),
  warning: (title: string, description?: string) =>
    toastEmitter.add(title, "warning", description),
};
