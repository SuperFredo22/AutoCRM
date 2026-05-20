import { supabase } from '../lib/supabase'

export const contactsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('contacts')
      .select('*, vehicles(id, brand, model, year)')
      .order('next_date', { ascending: true, nullsFirst: false })
    return { data, error }
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('contacts')
      .select('*, vehicles(id, brand, model, year, status)')
      .eq('id', id)
      .single()
    return { data, error }
  },

  async getByVehicle(vehicleId) {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('vehicle_id', vehicleId)
    return { data, error }
  },

  async create(contact) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('contacts')
      .insert({ ...contact, created_by: user.id })
      .select()
      .single()
    if (data) {
      await supabase.from('activity_log').insert({
        entity_type: 'contact',
        entity_id: data.id,
        user_id: user.id,
        action: 'created',
        metadata: { name: data.name },
      })
    }
    return { data, error }
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('contacts')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  async delete(id) {
    const { error } = await supabase.from('contacts').delete().eq('id', id)
    return { error }
  },

  async getActivityLog(contactId) {
    const { data, error } = await supabase
      .from('activity_log')
      .select('*, user_profiles(name, color)')
      .eq('entity_type', 'contact')
      .eq('entity_id', contactId)
      .order('created_at', { ascending: false })
    return { data, error }
  },
}
