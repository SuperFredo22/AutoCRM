import { supabase } from '../lib/supabase'

export const profilesService = {
  async getAll() {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('color')
    return { data, error }
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },
}
