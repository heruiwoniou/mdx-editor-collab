import { CollaborationPlugin } from '@lexical/react/LexicalCollaborationPlugin';
import { Provider } from '@lexical/yjs';
import {
  addComposerChild$,
  Cell,
  realmPlugin,
  useCellValue,
} from '@mdxeditor/editor';
import React, { useCallback, useEffect, useState } from 'react';
import { WebsocketProvider } from 'y-websocket';
import { Doc } from 'yjs';

type CollaborationId = string;

const collaborationId$ = Cell<CollaborationId>('');

const CollaborationPluginChild = () => {
  const [provider, setProvider] = useState<Provider>();
  const [activeUsers, setActiveUsers] = useState<string[]>([]);
  const id = useCellValue(collaborationId$);
  const createWebsocketProvider = useCallback(
    (id: string, yjsDocMap: Map<string, Doc>) => {
      let doc = yjsDocMap.get(id);

      if (doc === undefined) {
        doc = new Doc();
        yjsDocMap.set(id, doc);
      } else {
        doc.load();
      }

      const websocketProvider = new WebsocketProvider(
        'ws://localhost:1234',
        // 'ws://staging-api.ipnovo.ai/agt/yjs',
        id,
        doc,
        {
          connect: false,
          // protocols: [
          //   'eyJraWQiOiJrMFlYQXhWdW1UVFR2SEZnZFM2N0NMc1hBYnVWckhGbjdzU2p6RFBWakUwPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI1NDg4ZTRiOC0yMGExLTcwNTUtMDAyZS0zNTAxZDRkZDE5MzYiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV8zREg2b1E0TnMiLCJjbGllbnRfaWQiOiI3bThzZzdwdG9nMjRvMmwyMXUwNGs5NnB2ZiIsIm9yaWdpbl9qdGkiOiJlY2YxNzM2Ni01NGQ5LTQ3ZWUtYjY4Yy1jMGZmMjZhMTU2M2MiLCJldmVudF9pZCI6IjQ5ZGM2MDEwLWM0ZTYtNDEwMi1iZTE1LTNiZjdiOGM4MzEzNSIsInRva2VuX3VzZSI6ImFjY2VzcyIsInNjb3BlIjoiYXdzLmNvZ25pdG8uc2lnbmluLnVzZXIuYWRtaW4iLCJhdXRoX3RpbWUiOjE3Mzk0NDM2MDAsImV4cCI6MTczOTQ0NTQwMCwiaWF0IjoxNzM5NDQzNjAwLCJqdGkiOiJlYjg4NTc4NS02M2FhLTRiOTAtYjkzYy04OTI4YzM1OTE4ODMiLCJ1c2VybmFtZSI6InJ1aS5oZS5kZXZlbG9wZXJfX2F0X19nbWFpbC5jb20ifQ.MsgVcZV94Mve1cQ8oSsBSwvBf1YntIHGwGBAuVCiUxABJl-wpkP1Ayl5LX12AbBTD-ZKikoHZ3TBu_R7baNfYO4KtOZOCyz48N2iVmPRdqkam2Wm55ryw8lV_Be3dhhvN34D-HIJj3j6kZcifU5BQ4v4NnqGaHUq_SZvT16mWUt_10TinoVu3VYC1piZpw8LVPV49LGXSvbFJ21v3eU4Zhri_7VzSHTd2wDZc7hyH4KmuDjdPluTV0xdkB-sMThH2pC5Fy9ebZRZ-7BdSRRNRq0emeJZCP0lYwmhIbwF_-qsjLrDuYgYdDIWHU5aew8XJqyAqd04FXAeL3ULHb-c2g',
          // ],
        }
      ) as unknown as Provider;

      websocketProvider.on('status', (e) => {
        console.log('status', e);
      });
      websocketProvider.on('sync', (e) => {
        console.log('sync', e);
      });
      websocketProvider.on('update', (e) => {
        console.log('update', e);
      });

      setTimeout(() => setProvider(websocketProvider), 0);

      return websocketProvider;
    },
    []
  );

  const handleAwarenessUpdate = useCallback(() => {
    const awareness = provider!.awareness!;
    setActiveUsers(
      Array.from(awareness.getStates().entries()).map(([, { name }]) => name)
    );
  }, [provider]);

  useEffect(() => {
    if (provider == null) {
      return;
    }

    provider.awareness.on('update', handleAwarenessUpdate);

    return () => provider.awareness.off('update', handleAwarenessUpdate);
  }, [provider, handleAwarenessUpdate]);

  return (
    <>
      Actives:{activeUsers.join(',')}
      <CollaborationPlugin
        id={id}
        providerFactory={createWebsocketProvider}
        shouldBootstrap={false}
      />
    </>
  );
};

const defaultParams = { id: 'default' };

export const collaborationPlugin = realmPlugin<{ id: CollaborationId }>({
  init(realm, params) {
    realm.pubIn({
      [collaborationId$]: params?.id ?? defaultParams.id,
      [addComposerChild$]: () => <CollaborationPluginChild />,
    });
  },
  update(r, params) {
    r.pubIn({
      [collaborationId$]: params?.id ?? defaultParams.id,
    });
  },
});
