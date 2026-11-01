import { Spinner } from "./ui/spinner";

export default function LoadingSpinner({ message }: { message?: string }) {
  return (
    <div className="flex items-center justify-center gap-4">
      <Spinner />
      {message && <p>{message}</p>}
    </div>
  );
}
