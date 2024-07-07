import { createFileRoute } from '@tanstack/react-router';
import MarkdownEditor from 'component/MarkdownEditor.tsx';
import { IPCActions } from 'electron-src/IPC/IPC-Actions.ts';

const { IPCRenderSide } = window;
export const Route = createFileRoute('/_tabFrame/edit/$filepath')({
  loader: async ({ params: { filepath } }) => {
    return await IPCRenderSide.invoke(IPCActions.FILES.READ_MD_PATH, filepath);
  },
});

// Using a wrapper here so that Route's loader data can be passed down easier and in the same file without cross importing
function EditorWrapper() {
  return (
    <>
      <MarkdownEditor MDSource={Route.useLoaderData()} />
    </>
  );
}
