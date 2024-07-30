import { ForwardedRef, forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import './MarkdownEditor.css';
import Editor, { TEditorForwardRef } from 'react-magic-draft';
import { TSelectionStatus } from 'react-magic-draft/dist/hooks/useEditorDaemon';

export type TEditorComponentRef = {
  ExtractMD: () => Promise<string>;
  ExtractSelection: () => Object | null | undefined;
  SetSelection: (SelectionStatus: Object) => void;
};

const MarkdownEditor = forwardRef(
  (
    {
      MDSource,
      onEditorUnmounted,
      onEditorMounted,
    }: {
      MDSource: string;
      onEditorMounted?: () => Promise<void> | void;
      onEditorUnmounted?: () => Promise<void> | void;
    },
    ref: ForwardedRef<TEditorComponentRef>,
  ) => {
    const EditorRef = useRef<TEditorForwardRef>(null);

    useImperativeHandle(ref, () => {
      return {
        ExtractMD: async () => {
          if (EditorRef.current) return await EditorRef.current.ExtractMD();
          return Promise.resolve('');
        },
        ExtractSelection: () => {
          if (EditorRef.current) return EditorRef.current.ExtractCaretData();
        },
        SetSelection: (SelectionStatus: Object) => {
          if (!SelectionStatus) return;
          if (
            !('StartingOffset' in SelectionStatus) ||
            !('AnchorNodeXPath' in SelectionStatus) ||
            !('StartingOffset' in SelectionStatus)
          ) {
            console.error('Not a valid SelectionStatus');
            return;
          }

          if (EditorRef.current) return EditorRef.current.SetCaretData(SelectionStatus as TSelectionStatus);
        },
      };
    });

    useEffect(() => {
      (async () => {
        if (typeof onEditorMounted === 'function') await onEditorMounted();
      })();
      return () => {
        if (typeof onEditorUnmounted === 'function') onEditorUnmounted();
      };
    }, []);

    // async function appClick() {
    // console.log('NOTAMARCK click');
    // if (EditorRef.current) {
    //   console.log(await EditorRef.current.ExtractMD());
    // }
    // }

    return (
      <>
        {/*<button className={'bg-amber-600'} onClick={appClick}>*/}
        {/*  NOTAMARCK EXTRACT*/}
        {/*</button>*/}
        <Editor SourceData={MDSource} ref={EditorRef} />
      </>
    );
  },
);

export default MarkdownEditor;
