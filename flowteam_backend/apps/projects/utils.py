from django.db import transaction

def reorder_items(model, id_list, extra_filter={}):
    """
    Bulk updates the 'order' field for a list of model instances based on their position in id_list.
    """
    with transaction.atomic():
        for index, item_id in enumerate(id_list):
            model.objects.filter(id=item_id, **extra_filter).update(order=index)
