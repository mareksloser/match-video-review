import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from './ApiContext';
import type { AuthLogFilter, Drawing, Marker, MarkerInput, MatchInput, Rule, SettingKey, User, UserInput } from '@/lib/types';
import { DEFAULT_SETTINGS } from '@/lib/settings';

export const keys = {
  me: ['me'] as const,
  categories: ['categories'] as const,
  matches: (categoryId: number | null) => ['matches', categoryId] as const,
  match: (id: number) => ['match', id] as const,
  markers: (matchId: number) => ['markers', matchId] as const,
  rules: ['rules'] as const,
  users: ['users'] as const,
  publicSettings: ['settings', 'public'] as const,
  adminSettings: ['settings', 'admin'] as const,
  analytics: (matchId: number) => ['analytics', matchId] as const,
};

export function useMe() {
  const api = useApi();
  return useQuery({ queryKey: keys.me, queryFn: () => api.me(), staleTime: Infinity });
}

export function useLogin() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => api.login(email, password),
    onSuccess: (s) => {
      qc.setQueryData(keys.me, s.user);
      void qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'me' });
    },
  });
}

export function useLogout() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.logout(),
    onSuccess: () => {
      qc.setQueryData(keys.me, null);
      void qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'me' });
    },
  });
}

export const useCategories = () => {
  const api = useApi();
  return useQuery({ queryKey: keys.categories, queryFn: () => api.categories() });
};

export const useMatches = (categoryId: number | null) => {
  const api = useApi();
  return useQuery({ queryKey: keys.matches(categoryId), queryFn: () => api.matches({ categoryId }) });
};

export const useMatch = (id: number) => {
  const api = useApi();
  return useQuery({ queryKey: keys.match(id), queryFn: () => api.match(id) });
};

export const useMarkers = (matchId: number) => {
  const api = useApi();
  return useQuery({ queryKey: keys.markers(matchId), queryFn: () => api.markers(matchId) });
};

export const useRules = (enabled = true) => {
  const api = useApi();
  return useQuery({ queryKey: keys.rules, queryFn: () => api.rules(), enabled });
};

export const useAnalytics = (matchId: number | null) => {
  const api = useApi();
  return useQuery({ queryKey: keys.analytics(matchId ?? 0), queryFn: () => api.analytics(matchId!), enabled: !!matchId });
};

/** All marker writes for one match, each invalidating what it changes. */
export function useMarkerMutations(matchId: number) {
  const api = useApi();
  const qc = useQueryClient();
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: keys.markers(matchId) });
    void qc.invalidateQueries({ queryKey: ['matches'] });
    void qc.invalidateQueries({ queryKey: keys.analytics(matchId) });
  };
  return {
    create: useMutation({ mutationFn: (input: MarkerInput) => api.createMarker(matchId, input), onSuccess: refresh }),
    update: useMutation({ mutationFn: ({ id, input }: { id: number; input: MarkerInput }) => api.updateMarker(id, input), onSuccess: refresh }),
    remove: useMutation({ mutationFn: (id: number) => api.deleteMarker(id), onSuccess: refresh }),
    saveDrawing: useMutation({ mutationFn: ({ id, drawing }: { id: number; drawing: Drawing }) => api.saveDrawing(id, drawing), onSuccess: refresh }),
    setReviewed: useMutation({
      mutationFn: ({ id, reviewed }: { id: number; reviewed: boolean }) => api.setReviewed(id, reviewed),
      // The checkbox flips immediately; on error the previous list comes back.
      onMutate: async ({ id, reviewed }) => {
        await qc.cancelQueries({ queryKey: keys.markers(matchId) });
        const previous = qc.getQueryData<Marker[]>(keys.markers(matchId));
        qc.setQueryData<Marker[]>(keys.markers(matchId), (list) => list?.map((m) => (m.id === id ? { ...m, reviewed } : m)));
        return { previous };
      },
      onError: (_e, _v, ctx) => qc.setQueryData(keys.markers(matchId), ctx?.previous),
      onSettled: refresh,
    }),
    markViewed: useMutation({ mutationFn: (id: number) => api.markViewed(id), onSuccess: refresh }),
  };
}

export function useCreateMatch() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, ...input }: MatchInput & { file?: File | null }) =>
      api.createMatch(file ? { ...input, videoType: 'ftp', videoUrl: (await api.uploadVideo(file)).url } : input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['matches'] }),
  });
}

export function useUpdateMatch(id: number) {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, ...input }: MatchInput & { file?: File | null }) =>
      api.updateMatch(id, file ? { ...input, videoType: 'ftp', videoUrl: (await api.uploadVideo(file)).url } : input),
    onSuccess: (m) => {
      qc.setQueryData(keys.match(id), m);
      void qc.invalidateQueries({ queryKey: ['matches'] });
    },
  });
}

export function useDeleteMatch() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteMatch(id),
    onSuccess: (_r, id) => {
      qc.removeQueries({ queryKey: keys.match(id) });
      qc.removeQueries({ queryKey: keys.markers(id) });
      void qc.invalidateQueries({ queryKey: ['matches'] });
    },
  });
}

export function useUpdateRule() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Omit<Rule, 'id'> }) => api.updateRule(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.rules }),
  });
}

export function useDeleteRule() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteRule(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.rules });
      void qc.invalidateQueries({ queryKey: ['markers'] }); // markers lose the deleted rule
    },
  });
}

export function useAuthLog(type: AuthLogFilter, q: string) {
  const api = useApi();
  return useInfiniteQuery({
    queryKey: ['authLog', type, q],
    queryFn: ({ pageParam }) => api.authLog({ type, q, before: pageParam }),
    initialPageParam: null as number | null,
    getNextPageParam: (last) => last.nextBefore,
  });
}

/** Public settings, refreshed every 2 minutes so maintenance mode reaches open tabs. */
export function usePublicSettings() {
  const api = useApi();
  return useQuery({
    queryKey: keys.publicSettings,
    queryFn: () => api.publicSettings(),
    staleTime: 60_000,
    refetchInterval: 120_000,
    placeholderData: DEFAULT_SETTINGS,
  });
}

/** Effective settings with defaults while loading — never undefined. */
export const useSettingsValues = () => usePublicSettings().data ?? DEFAULT_SETTINGS;

export function useAdminSettings() {
  const api = useApi();
  const qc = useQueryClient();
  const query = useQuery({ queryKey: keys.adminSettings, queryFn: () => api.settings() });
  const update = useMutation({
    mutationFn: (values: Partial<Record<SettingKey, unknown>>) => api.updateSettings(values),
    onSuccess: (rows) => {
      qc.setQueryData(keys.adminSettings, rows);
      void qc.invalidateQueries({ queryKey: keys.publicSettings });
      void qc.invalidateQueries({ queryKey: ['matches'] }); // public gallery switch
    },
  });
  return { query, update };
}

export const useUsers = () => {
  const api = useApi();
  return useQuery({ queryKey: keys.users, queryFn: () => api.users() });
};

/** Create / update / delete users. Editing yourself refreshes the header too. */
export function useUserMutations() {
  const api = useApi();
  const qc = useQueryClient();
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: keys.users });
    void qc.invalidateQueries({ queryKey: ['analytics'] });
    void qc.invalidateQueries({ queryKey: ['authLog'] });
  };
  return {
    create: useMutation({ mutationFn: (input: UserInput) => api.createUser(input), onSuccess: refresh }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: number; input: UserInput }) => api.updateUser(id, input),
      onSuccess: (user) => {
        refresh();
        if (qc.getQueryData<User | null>(keys.me)?.id === user.id) qc.setQueryData(keys.me, user);
      },
    }),
    remove: useMutation({ mutationFn: (id: number) => api.deleteUser(id), onSuccess: refresh }),
  };
}

export function useCreateRule() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<Rule, 'id'>) => api.createRule(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.rules }),
  });
}
