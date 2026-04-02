import { Resend } from 'resend'
import supabase from '../db/supabase.js'

let resend = null

function getResend() {
  if (!resend && process.env.RESEND_API_KEY) resend = new Resend(process.env.RESEND_API_KEY)
  return resend
}

export async function sendParentEmailForHomework(classGroupId, homeworkTitle, dueDate) {
  const r = getResend()
  if (!r) return

  const { data: parents } = await supabase
    .from('users')
    .select('email, full_name, parent_of_user_id')
    .eq('role', 'parent')
    .not('email', 'is', null)

  if (!parents?.length) return

  const studentIds = parents.map((p) => p.parent_of_user_id).filter(Boolean)
  const { data: students } = await supabase
    .from('users')
    .select('id, full_name, class_group_id')
    .in('id', studentIds)
    .eq('class_group_id', classGroupId)

  const studentMap = Object.fromEntries((students || []).map((s) => [s.id, s]))
  const eligible = parents.filter((p) => studentMap[p.parent_of_user_id])

  for (const parent of eligible) {
    const student = studentMap[parent.parent_of_user_id]
    await r.emails.send({
      from: process.env.EMAIL_FROM || 'JBM EduConnect <noreply@jbmschool.edu>',
      to: parent.email,
      subject: `New Homework Assigned: ${homeworkTitle}`,
      html: `<p>Dear ${parent.full_name},</p>
<p>New homework has been assigned to <strong>${student.full_name}</strong>:</p>
<p><strong>${homeworkTitle}</strong><br>Due: ${new Date(dueDate).toLocaleDateString('en-IN')}</p>
<p>Please encourage your child to complete it on time.</p>
<p>— JBM Public School, Nasirpur</p>`
    }).catch(() => {})
  }
}
