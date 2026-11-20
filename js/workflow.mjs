// Status actions shared by the admin panel and smoke checks.
export const orderTypes = ["dine_in","takeaway","delivery"];
export const paymentStatuses = ["unpaid","paid","failed","refunded"];

export const workflows = {
  orders: {
    states: ["pending","confirmed","preparing","ready","out_for_delivery","completed","cancelled"],
    next: {
      pending: ["confirmed"],
      confirmed: ["preparing","ready","cancelled"],
      preparing: ["ready","cancelled"],
      ready: ["out_for_delivery","completed","cancelled"],
      out_for_delivery: ["completed"],
    },
  },
  bookings: {
    states: ["pending","confirmed","cancelled","completed","no_show"],
    next: {
      pending: ["confirmed","cancelled"],
      confirmed: ["completed","cancelled","no_show"],
    },
  },
  job_applications: {
    states: ["pending","reviewing","shortlisted","rejected","hired"],
    next: {
      pending: ["reviewing","rejected"],
      reviewing: ["shortlisted","rejected"],
      shortlisted: ["hired","rejected"],
    },
  },
  contact_messages: {
    states: ["new","read","replied","archived"],
    next: {
      new: ["read"],
      read: ["replied"],
      replied: ["archived"],
    },
  },
};

export function nextStatuses(table, status, orderType) {
  return (workflows[table].next[status] ?? []).filter(next =>
    next !== 'out_for_delivery' || orderType === 'delivery');
}
