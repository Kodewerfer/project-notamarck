import { createFileRoute, Navigate, useNavigate } from '@tanstack/react-router';
import { IPCActions } from 'electron-src/IPC/IPC-Actions.ts';
import { useEffect, useMemo, useRef, useState } from 'react';
import { TTagsInMemory } from 'electron-src/Types/Tags.ts';
import { Reorder, useAnimation, useDragControls } from 'framer-motion';
import { Parent } from 'unist';
import { u } from 'unist-builder';
import { XMarkIcon } from '@heroicons/react/16/solid';
import { motion } from 'framer-motion';
import _ from 'lodash';
import path from 'path-browserify';

const { IPCRenderSide } = window;
export const Route = createFileRoute('/TagFrame/$tagPath')({
  loader: async ({ params: { tagPath } }) => {
    return {
      tag: await IPCRenderSide.invoke(IPCActions.DATA.SET_TAG_AS_EDITING, tagPath),
      workspacePath: await IPCRenderSide.invoke(IPCActions.APP.GET_WORK_SPACE),
    };
  },
  staleTime: 0,
  gcTime: 0,
  shouldReload: true,
  component: TagEdit,
});

function TagEdit() {
  // used as a reference only
  const [EditingTag, setEditingTag] = useState<TTagsInMemory | undefined | null>(Route.useLoaderData().tag);
  const workspacePath = Route.useLoaderData().workspacePath || '';
  // AST tree's first-level children nodes
  const [TagRenderingSource, setTagRenderingSource] = useState<Parent[] | null>(null);
  const renderingSourceCache = useRef<any[] | null>(null);

  // when editing tag changed, send the tagName to main to fetch converted content. NOTE: tagContentRaw from EditingTag is not sent directly
  useEffect(() => {
    if (!EditingTag) return;

    console.log('editing tag');

    (async () => {
      const convertedContent = await IPCRenderSide.invoke(
        IPCActions.CONVERSION.CONVERT_TAG_RAW_FROM_NAME,
        EditingTag.tagFileName,
      );

      const ChildrenArr = Array.from(convertedContent.children);

      IPCRenderSide.send(IPCActions.FILES.VALIDATE_TAG_IN_LINKED_FILES, EditingTag, ChildrenArr);

      if (convertedContent && convertedContent.children) setTagRenderingSource(ChildrenArr as Parent[]);
    })();
  }, [EditingTag]);

  // save the tag file when component unmount
  useEffect(() => {
    return () => {
      if (EditingTag && renderingSourceCache.current) UpdateTag(EditingTag.tagPath, renderingSourceCache.current);
    };
  }, []);

  // cache the lasted rendering
  useEffect(() => {
    if (TagRenderingSource) renderingSourceCache.current = [...TagRenderingSource];
  }, [TagRenderingSource]);

  // bind events
  useEffect(() => {
    const unbindTagEditingChange = IPCRenderSide.on(
      IPCActions.DATA.PUSH.EDITING_TAG_CHANGED,
      (_, payload: TTagsInMemory | null) => {
        setEditingTag(payload);
      },
    );
    const unbindTagContentChange = IPCRenderSide.on(
      IPCActions.DATA.PUSH.TAG_CONTENT_CHANGED,
      (_, payload: TTagsInMemory | null) => {
        if (payload && payload.tagPath === EditingTag?.tagPath) setEditingTag(payload);
      },
    );

    return () => {
      unbindTagEditingChange();
      unbindTagContentChange();
    };
  }, []);

  function ReOrderItems(newData: Parent[]) {
    setTagRenderingSource(newData);
  }

  function OnEditingTitle(data: any, newString: string) {
    if (data.type !== 'heading') return;
    setTagRenderingSource(prevState => {
      if (!prevState) return null;
      return prevState.map((item: any) => {
        let newItem = item;
        if (item.uid === data.uid) {
          newItem = u('heading', [u('text', newString)]);
          newItem.uid = data.uid + '_' + _.random(9, 9999);
        }
        return newItem;
      });
    });
  }

  function OnAddNewTitle(data: any) {
    // console.log(data);
    if (!TagRenderingSource) return;
    const insertIndex = TagRenderingSource.findIndex((item: any) => item.uid === data.uid);
    if (insertIndex < 0) return;
    const newTitleNode = u('heading', { uid: `newHeading_${_.random(1, 999)}_${_.random(1, 999)}` }, [
      u('text', 'New Title'),
    ]);

    setTagRenderingSource([
      ...TagRenderingSource.slice(0, insertIndex),
      newTitleNode,
      ...TagRenderingSource.slice(insertIndex),
    ]);
  }

  function OnRemoveTitle(data: any) {
    if (data.type !== 'heading') return;
    if (!TagRenderingSource) return;
    setTagRenderingSource(prev => {
      if (!prev) return null;
      return prev.filter((item: any) => item.uid !== data.uid);
    });
  }

  function UpdateTag(targetPath: string, [...renderingSource]: Parent[]) {
    console.log('Tag content saved');
    const root = u('root', [...renderingSource]);
    IPCRenderSide.send(IPCActions.FILES.UPDATE_TARGET_TAG_CONTENT, targetPath, root);
  }

  return (
    <div className={'h-full bg-gray-50 dark:bg-slate-700 dark:text-blue-50'}>
      {/*return to the listing page if the tag is invalid*/}
      {!EditingTag && <Navigate to={'/TagFrame'} />}
      {/*Editing page*/}
      <h1 className={'center mb-2 select-none px-6 py-2 text-center text-xl font-bold'}>
        {EditingTag?.tagFileName || ''}
      </h1>
      {TagRenderingSource && TagRenderingSource.length > 0 && (
        <Reorder.Group
          as={'div'}
          onReorder={ReOrderItems}
          values={TagRenderingSource}
          className={'flex flex-col items-center px-10 py-12'}
        >
          {TagRenderingSource &&
            TagRenderingSource.map((paragraphData: any) => {
              if (paragraphData.type === 'heading')
                // uid is added by reader via transformer
                return (
                  <HeaderRenderer
                    EditTitle={OnEditingTitle}
                    RemoveTitle={OnRemoveTitle}
                    data={paragraphData}
                    key={paragraphData.uid}
                  />
                );

              return (
                <LinkRenderer
                  workspacePath={workspacePath}
                  AddTitleCallback={OnAddNewTitle}
                  data={paragraphData}
                  key={paragraphData.uid}
                />
              );
            })}
        </Reorder.Group>
      )}
      {(!TagRenderingSource || TagRenderingSource.length === 0) && (
        <div className={'flex h-full w-full justify-center'}>
          <div className={'select-none pt-20 font-semibold text-slate-500 drop-shadow dark:text-gray-300'}>
            -- EMPTY --
          </div>
        </div>
      )}
    </div>
  );
}

function HeaderRenderer({
  data,
  RemoveTitle,
  EditTitle,
}: {
  data: any;
  RemoveTitle: (data: any) => void;
  EditTitle: (data: any, newString: string) => void;
}) {
  if (!data.children || data.children[0].type !== 'text') return;
  const textNode = useMemo(() => data.children[0], [data.children]);

  const [TitleText, setTitleText] = useState(textNode.value);
  const [PendingTitleText, setPendingTitleText] = useState(textNode.value);

  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // detailed control of dragging behavior
  const dragControls = useDragControls();

  function OnDragReorder(ev: any) {
    if (isEditing) return;
    dragControls.start(ev);
  }

  useEffect(() => {
    if (isEditing && inputRef.current) inputRef.current.focus();
  }, [isEditing]);

  // animation
  const AnimControl = useAnimation();
  const SlideUpAction = () => {
    AnimControl.start({
      top: '-1.25rem',
      opacity: 100,
      translateX: '-50%',
      transition: { duration: 0.5 },
    });
  };
  const SlideDownAction = () => {
    AnimControl.start({
      top: 0,
      opacity: 0,
      transition: { duration: 0.3 },
    });
  };

  return (
    <Reorder.Item
      as={'div'}
      value={data}
      className={'group relative mb-6'}
      onMouseEnter={SlideUpAction}
      onMouseLeave={SlideDownAction}
      dragListener={false}
      dragControls={dragControls}
      onPointerDown={OnDragReorder}
    >
      {/*title text*/}
      <motion.div
        className={
          'relative z-20 w-2/3 min-w-80 cursor-default items-center justify-center border-b-2 border-solid bg-gray-50 px-4 py-4 text-center text-2xl font-semibold hover:w-2/3 hover:border-dashed dark:bg-slate-700'
        }
      >
        {!isEditing && (
          <h1 onDoubleClick={() => setIsEditing(true)} className={`m-auto w-fit cursor-text select-none`}>
            {TitleText}
          </h1>
        )}
        {isEditing && (
          <input
            className={`m-auto h-full w-full border-0 border-transparent bg-transparent text-center outline-none`}
            ref={inputRef}
            value={PendingTitleText}
            onBlur={() => {
              // cancel changing title
              setIsEditing(false);
            }}
            onKeyUp={ev => {
              if (ev.key === 'Enter') {
                setIsEditing(false);
                EditTitle(data, PendingTitleText);
              }
            }}
            onChange={ev => setPendingTitleText(ev.target.value)}
          />
        )}
      </motion.div>
      {/*pop up action*/}
      {!isEditing && (
        <motion.div
          animate={AnimControl}
          initial={{ translateX: '-50%', top: '1.25rem', opacity: 0, z: 0 }}
          onClick={() => RemoveTitle(data)}
          className={`invisible absolute -top-5 left-1/2 z-10 h-8 w-full -translate-x-1/2 cursor-pointer rounded-tl-lg rounded-tr-lg bg-red-500/35 hover:bg-red-500/85 group-hover:visible`}
        >
          <XMarkIcon className={'m-auto size-5 text-blue-50'} />
        </motion.div>
      )}
    </Reorder.Item>
  );
}

function LinkRenderer({
  data,
  AddTitleCallback,
  workspacePath,
}: {
  data: any;
  AddTitleCallback: (data: any) => void;
  workspacePath: string;
}) {
  const navigate = useNavigate();

  if (!data.children || !data.children.length) return;
  const TextDirective = useMemo(() => data.children[0], [data.children]);

  if (!TextDirective.children || !TextDirective.children[0]) return;

  const DirectiveText = useMemo(() => TextDirective.children[0].value, [TextDirective.children]);

  const controls = useAnimation();
  const SlideUpAction = () => {
    controls.start({
      top: '-1.25rem',
      opacity: 100,
      translateX: '-50%',
      transition: { duration: 0.5 },
    });
  };
  const SlideDownAction = () => {
    controls.start({
      top: 0,
      opacity: 0,
      transition: { duration: 0.3 },
    });
  };

  return (
    <Reorder.Item
      as={'div'}
      value={data}
      className={'group relative mb-6'}
      onMouseEnter={SlideUpAction}
      onMouseLeave={SlideDownAction}
    >
      {/* display block */}
      <div
        onDoubleClick={() =>
          navigate({
            to: '/FileFrame/edit/$filepath',
            params: { filepath: path.join(workspacePath, DirectiveText) },
          })
        }
        className={
          'relative z-20 w-2/3 min-w-80 cursor-default rounded-2xl bg-gray-100 px-4 py-6 text-center text-xl hover:rounded-lg dark:bg-slate-600 dark:hover:bg-slate-500'
        }
      >
        {DirectiveText.split('.')[0]}
      </div>
      {/* add new text pop-up */}
      <motion.div
        onClick={() => AddTitleCallback(data)}
        animate={controls}
        initial={{ translateX: '-50%', top: '1.25rem', opacity: 0, z: 0 }}
        className={
          'invisible absolute -top-5 left-1/2 z-10 h-8 w-full -translate-x-1/2 cursor-pointer rounded-tl-lg rounded-tr-lg bg-green-600/50 text-center text-sm text-blue-50 hover:bg-green-600/80 group-hover:visible'
        }
      >
        + Add Title
      </motion.div>
    </Reorder.Item>
  );
}
