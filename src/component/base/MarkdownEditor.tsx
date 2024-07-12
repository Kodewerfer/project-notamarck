import { ForwardedRef, forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import './MarkdownEditor.css';
import Editor, { TEditorForwardRef } from 'react-magic-draft';
import { IPCActions } from 'electron-src/IPC/IPC-Actions.ts';

const { ipcRenderer } = window;

export type TEditorComponentRef = {
  ExtractMD: () => Promise<string>;
};

const MarkdownEditor = forwardRef(({ MDSource }: { MDSource: string }, ref: ForwardedRef<TEditorComponentRef>) => {
  const EditorRef = useRef<TEditorForwardRef>(null);

  useImperativeHandle(ref, () => {
    return {
      ExtractMD: async () => {
        if (EditorRef.current) return await EditorRef.current.ExtractMD();
        return Promise.resolve('');
      },
    };
  });

  async function appClick() {
    console.log('NOTAMARCK click');
    if (EditorRef.current) {
      console.log(await EditorRef.current.ExtractMD());
    }
  }

  async function showDialog() {
    console.log('showing dialog');
    const DIRPath = await ipcRenderer.invoke(IPCActions.DIALOG.SHOW_SELECTION_DIR);
    //Invalid
    if (!DIRPath || DIRPath.length > 1) return;
    // Only one folder should be allowed to choose at a time
    console.log(DIRPath[0]);
  }

  return (
    <>
      <button className={'bg-amber-600'} onClick={appClick}>
        NOTAMARCK EXTRACT
      </button>
      <Editor SourceData={MDSource} ref={EditorRef} />
    </>
  );
});

export default MarkdownEditor;
