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
        id,
        doc,
        {
          connect: false,
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
