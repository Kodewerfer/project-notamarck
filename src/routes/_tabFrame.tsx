import { createFileRoute } from '@tanstack/react-router';
import TabFrame from 'component/TabFrame.tsx';

export const Route = createFileRoute('/_tabFrame')({
  // loader: async () => {
  //   return (await IPCRenderSide.invoke(IPCActions.DATA.GET_ALL_OPENED_FILES)) ?? [];
  // },
  component: TabFrame,
});
