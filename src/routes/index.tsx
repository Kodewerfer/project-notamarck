import {createFileRoute} from "@tanstack/react-router";

export const Route = createFileRoute('/')({
    component: EmptyEditor,
})

function EmptyEditor() {
    return (
        <>
            <div> EMPTY</div>
        </>
    )
}
