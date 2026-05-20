import { supabase } from '../lib/supabase'

export const agendaService = {
  async getSlotsForWeek(startDate, endDate) {
    const { data, error } = await supabase
      .from('availability_slots')
      .select('*, user_profiles(name, color)')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date')
      .order('start_time')
    return { data, error }
  },

  async getAppointmentsForWeek(startDate, endDate) {
    const { data, error } = await supabase
      .from('appointments')
      .select('*, vehicles(brand, model), contacts(name), user_profiles(name, color)')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date')
      .order('start_time')
    return { data, error }
  },

  async createSlot(slot) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('availability_slots')
      .insert({ ...slot, user_id: user.id })
      .select()
      .single()
    return { data, error }
  },

  async createAppointment(appointment) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('appointments')
      .insert({ ...appointment, created_by: user.id })
      .select()
      .single()
    return { data, error }
  },

  async updateSlot(id, updates) {
    const { data, error } = await supabase
      .from('availability_slots')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  async updateAppointment(id, updates) {
    const { data, error } = await supabase
      .from('appointments')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  async deleteSlot(id) {
    const { error } = await supabase.from('availability_slots').delete().eq('id', id)
    return { error }
  },

  async deleteAppointment(id) {
    const { error } = await supabase.from('appointments').delete().eq('id', id)
    return { error }
  },
}
