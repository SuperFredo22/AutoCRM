import { supabase } from '../lib/supabase'

export const vehiclesService = {
  async getAll() {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*, contacts(id, name, type)')
      .order('created_at', { ascending: false })
    return { data, error }
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', id)
      .single()
    return { data, error }
  },

  async create(vehicle) {
    const { data: authData } = await supabase.auth.getUser()
    const user = authData?.user
    if (!user) return { data: null, error: new Error('Non authentifié') }
    const { data, error } = await supabase
      .from('vehicles')
      .insert({ ...vehicle, created_by: user.id })
      .select()
      .single()
    if (data) {
      await supabase.from('activity_log').insert({
        entity_type: 'vehicle',
        entity_id: data.id,
        user_id: user.id,
        action: 'created',
        metadata: { brand: data.brand, model: data.model },
      })
    }
    return { data, error }
  },

  async update(id, updates) {
    const { data: authData } = await supabase.auth.getUser()
    const user = authData?.user
    const { data, error } = await supabase
      .from('vehicles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (data && user) {
      const tracked = ['brand', 'model', 'year', 'mileage', 'seller_price', 'listing_price', 'type', 'source', 'assigned_to', 'notes']
      const changed = Object.keys(updates).filter(k => tracked.includes(k))
      if (changed.length > 0) {
        await supabase.from('activity_log').insert({
          entity_type: 'vehicle',
          entity_id: id,
          user_id: user.id,
          action: 'updated',
          metadata: { fields: changed },
        })
      }
    }
    return { data, error }
  },

  async updateStatus(id, newStatus, oldStatus) {
    const { data: authData } = await supabase.auth.getUser()
    const user = authData?.user
    const { data, error } = await supabase
      .from('vehicles')
      .update({ status: newStatus, updated_at: new Date().toISOString(), ...(newStatus === 'vendu' ? { sold_at: new Date().toISOString() } : {}) })
      .eq('id', id)
      .select()
      .single()
    if (data && user) {
      await supabase.from('activity_log').insert({
        entity_type: 'vehicle',
        entity_id: id,
        user_id: user.id,
        action: 'status_changed',
        metadata: { from: oldStatus, to: newStatus },
      })
    }
    return { data, error }
  },

  async delete(id) {
    const { error } = await supabase.from('vehicles').delete().eq('id', id)
    return { error }
  },

  async getActivityLog(vehicleId) {
    const { data, error } = await supabase
      .from('activity_log')
      .select('*, user_profiles(name, color)')
      .eq('entity_type', 'vehicle')
      .eq('entity_id', vehicleId)
      .order('created_at', { ascending: false })
    return { data, error }
  },

  async deletePhoto(url) {
    const marker = '/vehicle-photos/'
    const idx = url.indexOf(marker)
    if (idx !== -1) {
      const path = url.slice(idx + marker.length)
      await supabase.storage.from('vehicle-photos').remove([path])
    }
  },

  async uploadPhoto(vehicleId, file) {
    const ext = file.name.split('.').pop()
    const path = `vehicles/${vehicleId}/${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage.from('vehicle-photos').upload(path, file)
    if (uploadError) return { error: uploadError }
    const { data: { publicUrl } } = supabase.storage.from('vehicle-photos').getPublicUrl(path)
    return { url: publicUrl }
  },
}
