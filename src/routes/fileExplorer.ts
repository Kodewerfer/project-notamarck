import {createFileRoute} from "@tanstack/react-router";
import {FileExplorer} from "component/FileExplorer.tsx";

export const Route = createFileRoute('/fileExplorer')({
    component: FileExplorer,
})
