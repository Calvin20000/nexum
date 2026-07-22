import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { GroupConversation, GroupConversationWithDetails, GroupMessage, UserProfile } from '@/types/database';

export type GroupConversationWithUnread = GroupConversationWithDetails & {
  unread_count: number;
};

export function useGroupConversations(userId: string | undefined) {
  const [groups, setGroups] = useState<GroupConversationWithUnread[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGroups = useCallback(async () => {
    if (!userId) return;

    const { data: memberRows } = await (supabase.from('group_members' as any) as any)
      .select('group_id, last_read_at')
      .eq('user_id', userId);

    console.log("memberRows:", JSON.stringify(memberRows));
    if (!memberRows || memberRows.length === 0) {
      console.log("count:",gcData?.length);    setGroups([]);
      setLoading(false);
      return;
    }

    console.log("groupIds:",memberRows?.length);
    const groupIds = (memberRows as any[]).map((r: any) => r.group_id);
    const readMap: Record<string, string | null> = {};
    (memberRows as any[]).forEach((r: any) => { readMap[r.group_id] = r.last_read_at; });

    const { data: gcData } = await (supabase.from('group_conversations' as any) as any)
      .select('*')
      .in('id', groupIds)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    const enriched: GroupConversationWithUnread[] = await Promise.all(
      ((gcData ?? []) as any[]).map(async (gc: any) => {
        // Fetch members
        const { data: allMemberRows } = await (supabase.from('group_members' as any) as any)
          .select('user_id')
          .eq('group_id', gc.id);
        const memberIds = ((allMemberRows ?? []) as any[]).map((m: any) => m.user_id);
        let members: UserProfile[] = [];
        if (memberIds.length > 0) {
          const { data: users } = await supabase.from('users').select('*').in('id', memberIds);
          members = (users ?? []) as UserProfile[];
        }

        // Last message with sender name
        const { data: lastMsg } = await (supabase.from('group_messages' as any) as any)
          .select('*, sender:users(display_name)')
          .eq('group_id', gc.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Unread count
        const lastRead = readMap[gc.id];
        let unread_count = 0;
        if (lastRead) {
          const { count } = await (supabase.from('group_messages' as any) as any)
            .select('*', { count: 'exact', head: true })
            .eq('group_id', gc.id)
            .neq('sender_id', userId)
            .gt('created_at', lastRead);
          unread_count = count ?? 0;
        } else {
          const { count } = await (supabase.from('group_messages' as any) as any)
            .select('*', { count: 'exact', head: true })
            .eq('group_id', gc.id)
            .neq('sender_id', userId);
          unread_count = count ?? 0;
        }

        return { ...gc, members, last_message: lastMsg ?? null, unread_count };
      })
    );

    setGroups(enriched);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel('group-messages-unread')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'group_messages',
      }, (payload) => {
        const newMsg = payload.new as any;
        if (newMsg.sender_id === userId) return;
        setGroups((prev) => prev.map((g) => 
          g.id === newMsg.group_id 
            ? { ...g, unread_count: (g.unread_count || 0) + 1, last_message_at: newMsg.created_at }
            : g
        ));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, fetchGroups]);
  const clearGroupUnread = useCallback((groupId: string) => {
    setGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, unread_count: 0 } : g));
  }, []);

  return { groups, loading, refetch: fetchGroups, clearGroupUnread };
}

export function useGroupChatMessages(groupId: string, userId: string | undefined) {
  const [groupConv, setGroupConv] = useState<GroupConversation | null>(null);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [memberReadMap, setMemberReadMap] = useState<Record<string, string | null>>({});
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [senderMap, setSenderMap] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 50;

  const markAsRead = useCallback(async () => {
    if (!userId || !groupId) return;
    const now = new Date().toISOString();
    await (supabase.from('group_members' as any) as any)
      .update({ last_read_at: now })
      .eq('group_id', groupId)
      .eq('user_id', userId);
    if (userId) {
      setMemberReadMap((prev) => ({ ...prev, [userId]: now }));
    }
  }, [groupId, userId]);


  const fetchData = useCallback(async () => {
    if (!groupId || !userId) return;

    const [{ data: gc }, { data: memberRows }, { data: msgs }] = await Promise.all([
      supabase.from('group_conversations' as any).select('*').eq('id', groupId).maybeSingle(),
      supabase.from('group_members' as any).select('user_id, last_read_at').eq('group_id', groupId),
      (supabase.from('group_messages' as any) as any)
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE),
    ]);

    setGroupConv(gc as unknown as GroupConversation);
    setHasMore((msgs?.length ?? 0) === PAGE_SIZE);
    setMessages((msgs ?? []) as GroupMessage[]);
    const memberIds = ((memberRows ?? []) as any[]).map((m: any) => m.user_id);
    if (memberIds.length > 0) {
      const { data: users } = await supabase.from('users').select('*').in('id', memberIds);
      const memberList = (users ?? []) as UserProfile[];
      setMembers(memberList);
      const map: Record<string, UserProfile> = {};
      memberList.forEach((u) => { map[u.id] = u; });
      const readMap2: Record<string, string | null> = {};
      ((memberRows ?? []) as any[]).forEach((r: any) => { readMap2[r.user_id] = r.last_read_at; });
      console.log("memberReadMap updated:", JSON.stringify(readMap2));
      setMemberReadMap(readMap2);
      setSenderMap(map);
    }

    setLoading(false);
    await markAsRead();
  }, [groupId, userId, markAsRead]);

  const loadMore = useCallback(async () => {
    if (!groupId || !hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    const { data } = await (supabase.from('group_messages' as any) as any)
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .range(messages.length, messages.length + PAGE_SIZE - 1);
    if (data && data.length > 0) {
      setMessages((prev) => [...prev, ...(data as GroupMessage[])]);
      setHasMore(data.length === PAGE_SIZE);
    } else {
      setHasMore(false);
    }
    setIsLoadingMore(false);
  }, [groupId, hasMore, isLoadingMore, messages.length]);

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel(`group_conv_${groupId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `group_id=eq.${groupId}` },
        async (payload) => {
          const newMsg = payload.new as GroupMessage;
          if (newMsg.sender_id === userId) return;
          setMessages((prev) => prev.find((m) => m.id === newMsg.id) ? prev : [newMsg, ...prev]);
          if (newMsg.sender_id !== userId) {
            if (!senderMap[newMsg.sender_id]) {
              const { data: u } = await supabase.from('users').select('*').eq('id', newMsg.sender_id).maybeSingle();
              if (u) setSenderMap((prev) => ({ ...prev, [(u as UserProfile).id]: u as UserProfile }));
            }
            if (Platform.OS !== 'web') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'group_messages', filter: `group_id=eq.${groupId}` },
        (payload) => {
          const updated = payload.new as GroupMessage;
          setMessages((prev) => prev.map((m) => m.id === updated.id ? updated : m));
        }
      )
      .subscribe();

    const memberChannel = supabase
      .channel(`group_members_${groupId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'group_members', filter: `group_id=eq.${groupId}` },
        (payload) => {
          const updated = payload.new as any;
          setMemberReadMap((prev) => ({
            ...prev,
            [updated.user_id]: updated.last_read_at,
          }));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(memberChannel);
    };
  }, [fetchData, groupId, userId]);

  const sendMessage = useCallback(async (content: string, type: GroupMessage['message_type'] = 'text') => {
    if (!content.trim() || !userId || !groupId || sending) return;
    setSending(true);


    const tempId = `temp_${Date.now()}_${Math.random()}`;
    const temp: GroupMessage = {
      id: tempId,
      group_id: groupId,
      sender_id: userId,
      message_type: type,
      content: content.trim(),
      image_url: null,
      is_deleted: false,
      reply_to_id: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [temp, ...prev]);

    const { data: msg, error } = await (supabase.from('group_messages' as any) as any)
      .insert({ group_id: groupId, sender_id: userId, message_type: type, content: content.trim() })
      .select()
      .single();

    if (!error && msg) {
      console.log('グループ送信成功:', (msg as GroupMessage).id);
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== tempId && m.id !== (msg as GroupMessage).id);
        return [(msg as GroupMessage), ...filtered];
      });
      await (supabase.from('group_conversations' as any) as any)
        .update({ last_message_at: (msg as GroupMessage).created_at })
        .eq('id', groupId);
    } else {
      console.error('グループ送信エラー:', JSON.stringify(error));
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    }
    setSending(false);
  }, [groupId, userId, sending]);

  const deleteMessage = useCallback(async (msgId: string) => {
    await (supabase.from('group_messages' as any) as any)
      .update({ is_deleted: true })
      .eq('id', msgId);
  }, []);

  return {
    groupConv, members, messages, senderMap, memberReadMap,
    loading, sending, isLoadingMore, hasMore,
    sendMessage, deleteMessage, loadMore, markAsRead, setMessages,
  };
}
