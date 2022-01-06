import types

from tf.core.helpers import htmlEsc
from tf.advanced.app import App


def fmt_layoutOrigFull(app, n, **kwargs):
    return _wrapHtml(app, n, "text-orig-full", **kwargs)


def fmt_layoutOrigLite(app, n, **kwargs):
    return _wrapHtml(app, n, "text-orig-lite", **kwargs)


def fmt_layoutTransFull(app, n, **kwargs):
    return _wrapHtml(app, n, "text-trans-full", **kwargs)


def fmt_layoutTransFuzzy(app, n, **kwargs):
    return _wrapHtml(app, n, "text-trans-fuzzy", **kwargs)


def fmt_layoutTransLite(app, n, **kwargs):
    return _wrapHtml(app, n, "text-trans-lite", **kwargs)


def _wrapHtml(app, n, fmt, first=True, last=True, **kwargs):
    api = app.api
    T = api.T
    F = api.F
    L = api.L
    slotType = F.otype.slotType
    maxNode = F.otype.maxNode
    nType = F.otype.v(n)
    speakerType = "word"

    text = T.text(n, fmt=fmt, descend=False if nType == slotType else None)
    if nType == slotType:
        return text

    words = [n] if nType == speakerType else L.d(n, otype=speakerType)
    firstW = words[0]
    lastW = words[-1]
    before = firstW - 1
    after = lastW + 1

    speakerBefore = F.speaker.v(before) if before > 0 else None
    speakerFirst = F.speaker.v(firstW)
    speakerLast = F.speaker.v(lastW)
    speakerAfter = F.speaker.v(after) if after <= maxNode else None

    speakerPre = (
        (
            (
                f'<span class="speaker">…{htmlEsc(speakerFirst)}…</span>'
                if speakerFirst
                else ""
            )
            if first
            else ""
        )
        if speakerBefore == speakerFirst
        else f'<span class="speaker">«{htmlEsc(speakerFirst)}…</span>'
        if speakerFirst is not None
        else f'<span class="speaker">…{htmlEsc(speakerBefore)}»</span>'
    )
    speakerPost = (
        (
            (
                f'<span class="speaker">…{htmlEsc(speakerLast)}…</span>'
                if speakerLast
                else ""
            )
            if last
            else ""
        )
        if speakerAfter == speakerLast
        else f'<span class="speaker">…{htmlEsc(speakerLast)}»</span>'
        if speakerLast is not None
        else f'<span class="speaker">«{htmlEsc(speakerAfter)}…</span>'
    )

    return f"{speakerPre}{text}{speakerPost}"


class TfApp(App):
    def __init__(app, *args, **kwargs):
        app.fmt_layoutOrigFull = types.MethodType(fmt_layoutOrigFull, app)
        app.fmt_layoutOrigLite = types.MethodType(fmt_layoutOrigLite, app)
        app.fmt_layoutTransFull = types.MethodType(fmt_layoutTransFull, app)
        app.fmt_layoutTransFuzzy = types.MethodType(fmt_layoutTransFuzzy, app)
        app.fmt_layoutTransLite = types.MethodType(fmt_layoutTransLite, app)
        super().__init__(*args, **kwargs)
