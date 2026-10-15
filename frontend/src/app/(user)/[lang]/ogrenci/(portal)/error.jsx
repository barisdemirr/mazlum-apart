"use client";

import ErrorState from "@/components/ui/ErrorState";

export default function Error({ error, reset }) {
    return <ErrorState error={error} reset={reset} />;
}
