import {menuImageUrl} from '../../js/menu-image.mjs';
import {action, button, el, field, result, rupees} from './ui.js';

const supported = ['image/jpeg','image/png','image/webp'];
const imageLimit = 5 * 1024 * 1024;

export async function render({client, projectUrl, view, role, notice}) {
  if (role !== 'owner') return;
  const body = el('div');
  view.replaceChildren(el('h1', {}, 'Menu manager'), body);
  await load();

  async function load() {
    body.replaceChildren(el('p', {}, 'Loading menu…'));
    try {
      const [categories, items, setting] = await Promise.all([
        result(client.from('menu_categories').select('*').order('display_order').order('name')),
        result(client.from('menu_items').select('*').order('display_order').order('name')),
        result(client.from('settings').select('value').eq('key','menu_is_sample').single()),
      ]);
      const sample = setting.value.is_sample;
      body.replaceChildren(el('article', {}, el('h2', {}, 'Menu prices'),
        el('p', {}, sample ? 'The public menu is marked as sample.' : 'The public menu uses approved prices.'),
        button(sample ? 'Mark menu as real prices' : 'Mark menu as sample prices', event =>
          action(event.currentTarget, notice, async () => {
            if (sample && (!items.some(item => item.is_available && categories.some(category => category.id === item.category_id && category.is_active)) || !confirm('Publish these prices as approved?'))) {
              notice('Real prices require an available dish and confirmation.'); return;
            }
            await result(client.from('settings').update({value:{is_sample:!sample}, updated_at:new Date().toISOString()}).eq('key','menu_is_sample'));
            await load(); notice('Menu price label updated.');
          }))),
        el('h2', {}, 'Categories'),
        editor('menu_categories', null, categories),
        ...(categories.length ? categories.map(row => editor('menu_categories', row, categories)) : [el('p', {}, 'No categories yet.')]),
        el('h2', {}, 'Items'),
        categories.length ? editor('menu_items', null, categories) : el('p', {}, 'Create a category before adding items.'),
        ...(items.length ? items.map(row => editor('menu_items', row, categories)) : [el('p', {}, 'No items yet.')]));
    } catch (error) {
      body.replaceChildren(el('p', {role:'alert'}, error.message), button('Retry', load));
    }
  }

  function editor(table, row, categories) {
    const isItem = table === 'menu_items';
    const name = el('input', {name:'name', value:row?.name ?? '', required:true, maxlength:100});
    const description = el('textarea', {name:'description', value:row?.description ?? '', maxlength:600});
    const sort = el('input', {name:'sort', type:'number', min:0, max:100000, step:1, required:true, value:row?.display_order ?? 0});
    const active = el('input', {type:'checkbox', checked:row ? Boolean(row[isItem ? 'is_available' : 'is_active']) : true});
    const form = el('form', {}, field('Name', name), field('Description', description), field('Sort order', sort),
      field(isItem ? 'Available' : 'Active', active));
    const price = el('input', {type:'number', min:1, max:100000, step:1, required:true, value:row?.price_inr ?? ''});
    const category = el('select', {required:true}, categories.map(cat => el('option', {value:cat.id}, cat.name)));
    const slug = el('input', {required:true, pattern:'[a-z0-9]+(?:-[a-z0-9]+)*', maxlength:100, value:row?.slug ?? ''});
    const veg = el('input', {type:'checkbox', checked:row?.veg ?? true});
    const tags = el('input', {maxlength:300, value:(row?.tags || []).join(', ')});
    const image = el('input', {name:'image_url', maxlength:500, value:row?.image_url ?? ''});
    const photo = el('input', {type:'file', accept:supported.join(',')});
    if (isItem) {
      if (row) category.value = row.category_id;
      form.append(field('Category', category), field('Price in rupees', price), field('Vegetarian', veg),
        field('Tags separated by commas', tags), field('Image path or project Storage URL', image),
        field('Replace image (JPEG, PNG or WebP, up to 5 MB)', photo));
    } else form.append(field('URL slug (lowercase letters, digits and hyphens)', slug));
    const submit = el('button', {}, row ? 'Save changes' : 'Create ' + (isItem ? 'item' : 'category'));
    form.append(submit);
    form.addEventListener('submit', event => {
      event.preventDefault();
      action(submit, notice, async () => {
        if (!name.value.trim()) throw new Error('Enter a name.');
        const fields = {name:name.value.trim(), description:description.value.trim(), display_order:sort.valueAsNumber};
        let imagePath;
        if (isItem) {
          Object.assign(fields, {price_inr:price.valueAsNumber, category_id:category.value, veg:veg.checked,
            tags:tags.value.split(',').map(tag => tag.trim()).filter(Boolean), is_available:active.checked});
          const file = photo.files[0];
          if (file) {
            if (!supported.includes(file.type) || file.size < 1 || file.size > imageLimit) throw new Error('Choose a JPEG, PNG or WebP image up to 5 MB.');
            const extension = {'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type];
            imagePath = crypto.randomUUID() + '.' + extension;
            const bucket = client.storage.from('menu-images');
            const url = menuImageUrl(bucket.getPublicUrl(imagePath).data.publicUrl, projectUrl);
            if (!url) throw new Error('Could not use this project’s public Storage URL.');
            await result(bucket.upload(imagePath,file,{contentType:file.type}));
            fields.image_url = url;
          } else {
            const url = menuImageUrl(image.value, projectUrl);
            if (image.value.trim() && !url) throw new Error('Use a local image path or this project’s public Storage URL.');
            fields.image_url = url || null;
          }
        } else Object.assign(fields, {slug:slug.value, is_active:active.checked});
        const query = client.from(table);
        try { await result(row ? query.update(fields).eq('id',row.id).select('id').single() : query.insert(fields)); }
        catch (error) {
          if (imagePath) await client.storage.from('menu-images').remove([imagePath]);
          throw error;
        }
        await load(); notice('Saved.');
      });
    });
    if (row) {
      if (isItem) form.append(button(row.is_available ? 'Make unavailable' : 'Make available', event => action(event.currentTarget, notice, async () => {
        await result(client.from(table).update({is_available:!row.is_available}).eq('id',row.id).select('id').single());
        await load(); notice('Availability updated.');
      })));
      form.append(button('Delete', event => action(event.currentTarget, notice, async () => {
        if (!confirm(isItem ? 'Delete this item?' : 'Delete this category and all its items?')) {notice(''); return;}
        await result(client.from(table).delete().eq('id',row.id).select('id').single());
        await load(); notice('Deleted.');
      })));
    }
    return row ? el('details', {}, el('summary', {}, row.name, isItem ? ' · ' + rupees(row.price_inr) + (row.is_available ? '' : ' · Unavailable') : ''), form) : form;
  }
}
