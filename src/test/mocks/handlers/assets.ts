import { http, HttpResponse } from 'msw'
import { mockAssetsResponse } from '../assets'
import { apiUrl } from '../url'

export const assetsHandlers = [
  http.get(apiUrl('/assets'), () => HttpResponse.json(mockAssetsResponse)),
]
