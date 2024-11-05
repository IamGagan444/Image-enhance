'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Eraser, Wand2 } from 'lucide-react'
import { processImageWithGemini } from '../app/action/Image-edit/route'
import Image from 'next/image'

export default function GeminiImageEditorApp() {
  const [image, setImage] = useState<string | null>(null)
  const [editedImage, setEditedImage] = useState<string | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [result, setResult] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isErasing, setIsErasing] = useState(true)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const contextRef = useRef<CanvasRenderingContext2D | null>(null)

  useEffect(() => {
    if (image) {
      const canvas = canvasRef.current
      const context = canvas?.getContext('2d')
      if (canvas && context) {
        const img = new Image()
        img.onload = () => {
          canvas.width = img.width
          canvas.height = img.height
          context.drawImage(img, 0, 0)
          contextRef.current = context
        }
        img.src = image
      }
    }
  }, [image])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => setImage(e.target?.result as string)
      reader.readAsDataURL(file)
    }
  }

  const startDrawing = ({ nativeEvent }: React.MouseEvent<HTMLCanvasElement>) => {
    const { offsetX, offsetY } = nativeEvent
    contextRef.current?.beginPath()
    contextRef.current?.moveTo(offsetX, offsetY)
    setIsDrawing(true)
  }

  const finishDrawing = () => {
    contextRef.current?.closePath()
    setIsDrawing(false)
  }

  const draw = ({ nativeEvent }: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const { offsetX, offsetY } = nativeEvent
    const context = contextRef.current
    if (context) {
      context.lineTo(offsetX, offsetY)
      context.stroke()
      if (isErasing) {
        context.globalCompositeOperation = 'destination-out'
        context.lineWidth = 20
      } else {
        context.globalCompositeOperation = 'source-over'
        context.lineWidth = 2
        context.strokeStyle = 'red'
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canvasRef.current || !prompt) return

    setIsLoading(true)
    try {
      const editedImageData = canvasRef.current.toDataURL('image/png')
      setEditedImage(editedImageData)

      const formData = new FormData()
      formData.append('image', editedImageData)
      formData.append('prompt', prompt)
      const response = await processImageWithGemini(formData)
      setResult(response)
    } catch (error) {
      console.error('Error:', error)
      setResult('An error occurred while processing your request.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-4">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Gemini Image Editor App</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="image">Upload Image</Label>
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
              />
            </div>
            {image && (
              <div className="space-y-2">
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    onClick={() => setIsErasing(true)}
                    variant={isErasing ? "default" : "outline"}
                  >
                    <Eraser className="mr-2 h-4 w-4" />
                    Erase
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setIsErasing(false)}
                    variant={!isErasing ? "default" : "outline"}
                  >
                    <Wand2 className="mr-2 h-4 w-4" />
                    Mark for Addition
                  </Button>
                </div>
                <div className="border rounded">
                  <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseUp={finishDrawing}
                    onMouseMove={draw}
                    className="max-w-full"
                  />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="prompt">Prompt for Image Editing</Label>
              <Textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe what to add or modify in the image..."
              />
            </div>
            <Button type="submit" disabled={isLoading || !image || !prompt}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing
                </>
              ) : (
                'Process Image'
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          {result && (
            <div className="w-full space-y-4">
              <h3 className="text-lg font-semibold">Result:</h3>
              <p className="whitespace-pre-wrap">{result}</p>
              {editedImage && (
                <div>
                  <h4 className="text-md font-semibold mb-2">Edited Image:</h4>
                  <Image src={editedImage} alt="Edited" className="max-w-full h-auto" />
                </div>
              )}
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}