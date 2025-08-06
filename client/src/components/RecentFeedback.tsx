import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, Star, Clock, MapPin, Play, Image as ImageIcon, Wifi } from "lucide-react";
import { useState, useEffect } from "react";
import AudioPlayer from "@/components/ui/AudioPlayer";
import ImageGallery from "@/components/ui/ImageGallery";

interface RecentFeedbackProps {
  realTimeUpdates?: boolean;
}

export default function RecentFeedback({ realTimeUpdates = false }: RecentFeedbackProps) {
  const [showDetails, setShowDetails] = useState<string | null>(null);
  const [newFeedbackIds, setNewFeedbackIds] = useState<Set<string>>(new Set());
  const tenantId = "a550e8e0-d5e7-4f82-8b9a-123456789012"; // This would come from auth context

  const { data: feedback, isLoading, refetch } = useQuery({
    queryKey: ['/api/feedback', tenantId, { limit: 20 }],
    retry: false,
    refetchInterval: realTimeUpdates ? 10000 : false, // Refetch every 10 seconds if real-time is enabled
  });

  // Mark new feedback items as "new" for a few seconds
  useEffect(() => {
    if (feedback && Array.isArray(feedback)) {
      const currentIds = new Set(feedback.map((item: any) => item.id));
      
      // Add new IDs to the set
      currentIds.forEach(id => {
        if (!newFeedbackIds.has(id)) {
          setNewFeedbackIds(prev => new Set([...prev, id]));
          
          // Remove the "new" indicator after 5 seconds
          setTimeout(() => {
            setNewFeedbackIds(prev => {
              const updated = new Set(prev);
              updated.delete(id);
              return updated;
            });
          }, 5000);
        }
      });
    }
  }, [feedback]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse border rounded-lg p-4">
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return 'text-green-600';
    if (rating >= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRatingBadge = (rating: number) => {
    if (rating >= 4) return 'default';
    if (rating >= 3) return 'secondary';
    return 'destructive';
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-blue-600" />
          Recent Feedback
          {realTimeUpdates && (
            <div className="flex items-center gap-1">
              <Wifi className="h-3 w-3 text-green-500" />
              <Badge variant="outline" className="text-xs">Live</Badge>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!Array.isArray(feedback) || feedback.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 font-medium">No feedback yet</p>
            <p className="text-sm text-gray-400">Customer feedback will appear here once collected</p>
          </div>
        ) : (
          <div className="space-y-4">
            {feedback.map((item: any, index: number) => {
              const isNew = newFeedbackIds.has(item.id);
              return (
                <div
                  key={item.id}
                  className={`border rounded-lg p-4 transition-all hover:shadow-md cursor-pointer ${
                    isNew ? 'bg-blue-50 border-blue-200 animate-pulse' : ''
                  }`}
                  onClick={() => setShowDetails(showDetails === item.id ? null : item.id)}
                  data-testid={`feedback-${index}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${item.customerName}`} />
                        <AvatarFallback>{item.customerName?.charAt(0) || 'C'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-gray-900 truncate">
                            {item.customerName || 'Anonymous'}
                          </h3>
                          {isNew && (
                            <Badge variant="default" className="text-xs animate-bounce">
                              NEW
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex items-center">
                            <Star className={`h-4 w-4 ${getRatingColor(item.overallRating)} mr-1`} />
                            <span className="font-medium">{item.overallRating}/5</span>
                          </div>
                          <Badge variant={getRatingBadge(item.overallRating)} className="text-xs">
                            {item.overallRating >= 4 ? 'Excellent' : item.overallRating >= 3 ? 'Good' : 'Needs Improvement'}
                          </Badge>
                          <div className="flex items-center text-gray-500 text-sm">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatTimeAgo(item.createdAt)}
                          </div>
                        </div>
                        {item.feedbackText && (
                          <p className="text-gray-600 text-sm line-clamp-2">
                            {item.feedbackText}
                          </p>
                        )}
                        
                        {/* Multimedia indicators */}
                        <div className="flex items-center gap-2 mt-2">
                          {item.voiceRecordingUrl && (
                            <div className="flex items-center gap-1 text-blue-600 text-xs">
                              <Play className="h-3 w-3" />
                              <span>Voice</span>
                            </div>
                          )}
                          {item.imageUrls && item.imageUrls.length > 0 && (
                            <div className="flex items-center gap-1 text-green-600 text-xs">
                              <ImageIcon className="h-3 w-3" />
                              <span>{item.imageUrls.length} image{item.imageUrls.length > 1 ? 's' : ''}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-gray-600"
                    >
                      {showDetails === item.id ? 'Hide' : 'View'}
                    </Button>
                  </div>

                  {/* Expanded Details */}
                  {showDetails === item.id && (
                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                      {item.feedbackText && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Full Feedback</h4>
                          <p className="text-gray-700">{item.feedbackText}</p>
                        </div>
                      )}
                      
                      {item.voiceRecordingUrl && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Voice Recording</h4>
                          <AudioPlayer audioUrl={item.voiceRecordingUrl} />
                        </div>
                      )}
                      
                      {item.imageUrls && item.imageUrls.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Images</h4>
                          <ImageGallery images={item.imageUrls} />
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Location:</span> {item.locationName || 'Unknown'}
                        </div>
                        <div>
                          <span className="font-medium">Submitted:</span> {new Date(item.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}